import { prisma } from '@e-ams/db';
import { getIo } from '../sockets/auction.socket';
import { pushNotification } from './notification.service';
import { addAuctionToCart } from './cart.service';

export async function finalizeAuction(auctionId: string, opts?: { awardHighest?: boolean }) {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: { bids: { orderBy: { amount: 'desc' }, take: 1 } },
  });
  if (!auction || auction.status !== 'LIVE') return null;

  const top = auction.bids[0];
  const reserveMet = opts?.awardHighest
    ? Boolean(top)
    : auction.reservePrice
      ? Number(top?.amount ?? 0) >= Number(auction.reservePrice)
      : Boolean(top);
  const winnerId = reserveMet && top ? top.bidderId : null;

  const updated = await prisma.auction.update({
    where: { id: auction.id },
    data: { status: 'ENDED', winnerId, reserveMet, endsAt: opts?.awardHighest ? new Date() : auction.endsAt },
  });

  try {
    getIo().to(`auction:${auction.id}`).emit('auction:ended', {
      auctionId: auction.id,
      winnerId,
      currentBid: updated.currentBid,
    });
    getIo().emit('market:bid', {
      auctionId: auction.id,
      currentBid: updated.currentBid,
      endsAt: updated.endsAt,
    });
  } catch {
    /* socket optional */
  }

  if (winnerId) {
    try {
      await addAuctionToCart(winnerId, auction.id);
    } catch {
      /* cart optional */
    }
    await pushNotification(
      winnerId,
      'AUCTION_WON',
      'You won an auction',
      `${auction.title} is in your cart. Complete checkout to pay.`,
      '/cart'
    );
    await pushNotification(
      auction.sellerId,
      'AUCTION_ENDED',
      opts?.awardHighest ? 'Auction closed — sold' : 'Auction ended — sold',
      `${auction.title} ended with a winning bid.`,
      `/auctions/${auction.slug}`
    );
  } else {
    await pushNotification(
      auction.sellerId,
      'AUCTION_ENDED',
      'Auction ended — no sale',
      `${auction.title} ended without meeting reserve / with no bids.`,
      `/auctions/${auction.slug}`
    );
  }

  return updated;
}

export async function closeExpiredAuctions() {
  const expired = await prisma.auction.findMany({
    where: { status: 'LIVE', endsAt: { lte: new Date() } },
    select: { id: true },
  });
  for (const auction of expired) {
    await finalizeAuction(auction.id);
  }
  return expired.length;
}

export function startAuctionCloser() {
  const tick = () => {
    closeExpiredAuctions().catch((err) => console.error('auction closer failed', err));
  };
  tick();
  return setInterval(tick, 30_000);
}
