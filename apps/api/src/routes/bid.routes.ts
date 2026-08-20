import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@e-ams/db';
import { requireAuth, requireRole, requireVerifiedKyc, AuthedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { getIo } from '../sockets/auction.socket';
import { pushNotification } from '../services/notification.service';

const router = Router();

const bidSchema = z.object({
  amount: z.number().positive(),
  isProxy: z.boolean().optional().default(false),
  maxProxyAmt: z.number().positive().optional(),
});

router.get('/mine', requireAuth, requireRole('BUYER'), async (req: AuthedRequest, res, next) => {
  try {
    const bids = await prisma.bid.findMany({
      where: { bidderId: req.user!.userId },
      include: { auction: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const seen = new Set<string>();
    const latest = bids.filter((b) => {
      if (seen.has(b.auctionId)) return false;
      seen.add(b.auctionId);
      return true;
    });
    res.json(latest);
  } catch (err) {
    next(err);
  }
});

router.post('/auctions/:auctionId', requireAuth, requireRole('BUYER'), requireVerifiedKyc, async (req: AuthedRequest, res, next) => {
  try {
    const { amount, isProxy, maxProxyAmt } = bidSchema.parse(req.body);
    const auctionId = req.params.auctionId;

    const result = await prisma.$transaction(async (tx) => {
      const auction = await tx.auction.findUnique({ where: { id: auctionId } });
      if (!auction) throw new ApiError(404, 'Auction not found');
      if (auction.status !== 'LIVE') throw new ApiError(409, 'Auction is not live');
      if (new Date() > auction.endsAt) throw new ApiError(409, 'Auction has ended');
      if (auction.sellerId === req.user!.userId) throw new ApiError(403, 'You cannot bid on your own listing');

      const minAcceptable = Number(auction.currentBid) + Number(auction.minIncrement);
      if (amount < minAcceptable) {
        throw new ApiError(400, `Bid must be at least ${minAcceptable}`);
      }
      if (isProxy && maxProxyAmt && maxProxyAmt < amount) {
        throw new ApiError(400, 'Proxy max must be at least the bid amount');
      }

      const prevTopBid = await tx.bid.findFirst({
        where: { auctionId },
        orderBy: { amount: 'desc' },
      });
      const lastBid = await tx.bid.findFirst({
        where: { auctionId },
        orderBy: { createdAt: 'desc' },
      });
      if (lastBid?.bidderId === req.user!.userId) {
        throw new ApiError(409, 'You already hold the latest bid. Wait for someone else to bid.');
      }

      const bid = await tx.bid.create({
        data: { auctionId, bidderId: req.user!.userId, amount, isProxy, maxProxyAmt },
      });

      let currentBid = amount;
      let proxyCounter = null as Awaited<ReturnType<typeof tx.bid.create>> | null;

      if (prevTopBid?.isProxy && prevTopBid.maxProxyAmt && prevTopBid.bidderId !== req.user!.userId) {
        const proxyMax = Number(prevTopBid.maxProxyAmt);
        const increment = Number(auction.minIncrement);
        const needed = amount + increment;
        if (proxyMax >= needed) {
          const counterAmt = Math.min(proxyMax, needed);
          proxyCounter = await tx.bid.create({
            data: {
              auctionId,
              bidderId: prevTopBid.bidderId,
              amount: counterAmt,
              isProxy: true,
              maxProxyAmt: prevTopBid.maxProxyAmt,
            },
          });
          currentBid = counterAmt;
        }
      }

      let newEndsAt = auction.endsAt;
      const msRemaining = auction.endsAt.getTime() - Date.now();
      if (auction.antiSnipe && msRemaining < 5 * 60 * 1000) {
        newEndsAt = new Date(Date.now() + 5 * 60 * 1000);
      }

      const updated = await tx.auction.update({
        where: { id: auctionId },
        data: {
          currentBid,
          reserveMet: auction.reservePrice ? currentBid >= Number(auction.reservePrice) : true,
          endsAt: newEndsAt,
        },
      });

      return { bid, proxyCounter, updated, prevTopBid, auction, newEndsAt };
    });

    const { bid, proxyCounter, updated, prevTopBid, auction, newEndsAt } = result;
    const leadingId = proxyCounter ? proxyCounter.bidderId : req.user!.userId;
    const leading = await prisma.user.findUnique({ where: { id: leadingId }, select: { fullName: true } });
    const io = getIo();
    const livePayload = {
      auctionId,
      amount: Number(updated.currentBid),
      bidderId: leadingId,
      bidder: { fullName: leading?.fullName ?? 'Bidder' },
      createdAt: (proxyCounter ?? bid).createdAt,
      currentBid: updated.currentBid,
      endsAt: updated.endsAt,
      reserveMet: updated.reserveMet,
      id: (proxyCounter ?? bid).id,
    };
    io.to(`auction:${auctionId}`).emit('bid:new', livePayload);
    io.emit('bid:new', livePayload);
    io.emit('market:bid', {
      auctionId,
      currentBid: updated.currentBid,
      endsAt: updated.endsAt,
      bidCountDelta: proxyCounter ? 2 : 1,
    });

    if (newEndsAt.getTime() !== auction.endsAt.getTime()) {
      io.to(`auction:${auctionId}`).emit('auction:extended', { auctionId, endsAt: updated.endsAt });
    }

    const outbidUser = proxyCounter ? req.user!.userId : prevTopBid?.bidderId;
    if (outbidUser && outbidUser !== (proxyCounter ? proxyCounter.bidderId : req.user!.userId)) {
      io.to(`user:${outbidUser}`).emit('outbid', { auctionId, newAmount: Number(updated.currentBid) });
      await pushNotification(outbidUser, 'OUTBID', 'You were outbid', `Someone bid $${Number(updated.currentBid)} on ${auction.title}`, `/auctions/${auction.slug}`);
    }

    res.status(201).json({ bid, proxyCounter, auction: updated });
  } catch (err) {
    next(err);
  }
});

router.get('/auctions/:auctionId', async (req, res, next) => {
  try {
    const bids = await prisma.bid.findMany({
      where: { auctionId: req.params.auctionId },
      orderBy: { amount: 'desc' },
      include: { bidder: { select: { id: true, fullName: true } } },
    });
    res.json(bids.map((b) => ({ ...b, bidder: { id: b.bidder.id, fullName: b.bidder.fullName } })));
  } catch (err) {
    next(err);
  }
});

export default router;