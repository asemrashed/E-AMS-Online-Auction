import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@e-ams/db';
import { requireAuth, requireRole, requireVerifiedKyc, AuthedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { getIo } from '../sockets/auction.socket';
import { pushNotification } from '../services/notification.service';
import { finalizeAuction } from '../services/auction-closer';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { category, status, search, sort } = req.query as Record<string, string>;
    const now = new Date();
    const where: Record<string, unknown> = {};
    if (category) where.category = category;

    if (status === 'ENDED') {
      where.status = 'ENDED';
    } else if (status === 'UPCOMING') {
      where.status = 'LIVE';
      where.startsAt = { gt: now };
    } else if (status === 'ALL') {
      where.status = { in: ['LIVE', 'ENDED'] };
    } else {
      where.status = 'LIVE';
      where.startsAt = { lte: now };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy =
      sort === 'ending-soon' ? { endsAt: 'asc' as const } :
      sort === 'price-high' ? { currentBid: 'desc' as const } :
      sort === 'price-low' ? { currentBid: 'asc' as const } :
      { createdAt: 'desc' as const };

    const auctions = await prisma.auction.findMany({
      where,
      orderBy,
      include: { seller: { select: { id: true, fullName: true, organization: true, avatarUrl: true } }, _count: { select: { bids: true } } },
      take: 60,
    });

    res.json(auctions);
  } catch (err) {
    next(err);
  }
});

router.get('/meta/categories', async (_req, res, next) => {
  try {
    const rows = await prisma.auction.findMany({
      where: { status: { in: ['LIVE', 'ENDED'] } },
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });
    res.json(rows.map((r) => r.category).filter(Boolean));
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const auction = await prisma.auction.findUnique({
      where: { slug: req.params.slug },
      include: {
        seller: { select: { id: true, fullName: true, organization: true, avatarUrl: true, createdAt: true } },
        bids: { orderBy: { amount: 'desc' }, take: 20, include: { bidder: { select: { id: true, fullName: true } } } },
        _count: { select: { bids: true, watchers: true } },
      },
    });
    if (!auction) throw new ApiError(404, 'Auction not found');
    const bids = auction.bids.map((b) => ({
      ...b,
      bidder: { id: b.bidder.id, fullName: b.bidder.fullName },
    }));
    res.json({ ...auction, bids });
  } catch (err) {
    next(err);
  }
});

const createAuctionSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  category: z.string(),
  condition: z.string(),
  images: z.array(z.string()).max(4).default([]),
  startingBid: z.number().positive(),
  reservePrice: z.number().positive().optional(),
  buyNowPrice: z.number().positive().optional(),
  minIncrement: z.number().positive().default(100),
  antiSnipe: z.boolean().default(false),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

function slugify(title: string) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
}

async function requireVerifiedBank(sellerId: string) {
  const bank = await prisma.bankAccount.findUnique({ where: { sellerId } });
  if (!bank) {
    throw new ApiError(412, 'Add your bank account details before creating a listing (required for payouts).');
  }
  if (!bank.verified) {
    throw new ApiError(412, 'Your bank account must be verified by an admin before you can create or publish listings.');
  }
}

router.post('/', requireAuth, requireRole('SELLER'), requireVerifiedKyc, async (req: AuthedRequest, res, next) => {
  try {
    await requireVerifiedBank(req.user!.userId);
    const data = createAuctionSchema.parse(req.body);

    const auction = await prisma.auction.create({
      data: {
        ...data,
        slug: slugify(data.title),
        sellerId: req.user!.userId,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        currentBid: data.startingBid,
        status: 'DRAFT',
      },
    });

    res.status(201).json(auction);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, requireRole('SELLER'), async (req: AuthedRequest, res, next) => {
  try {
    const existing = await prisma.auction.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { bids: true } }, order: { select: { id: true } } },
    });
    if (!existing) throw new ApiError(404, 'Auction not found');
    if (existing.sellerId !== req.user!.userId) throw new ApiError(403, 'Not your listing');
    if (existing.status === 'ENDED' || existing.status === 'CANCELLED') {
      throw new ApiError(409, 'This listing can no longer be edited');
    }
    if (existing.order) throw new ApiError(409, 'Sold listings cannot be edited');

    const data = createAuctionSchema.partial().parse(req.body);
    const bidCount = existing._count.bids;
    const now = new Date();
    const biddingStarted = existing.status === 'LIVE' && existing.startsAt <= now;

    if (data.startsAt && biddingStarted) {
      throw new ApiError(409, 'Start time cannot be changed after bidding has begun');
    }
    if (bidCount > 0 && data.startingBid !== undefined && Number(data.startingBid) !== Number(existing.startingBid)) {
      throw new ApiError(409, 'Starting bid cannot be changed after bids have been placed');
    }

    const nextStarts = data.startsAt ? new Date(data.startsAt) : existing.startsAt;
    const nextEnds = data.endsAt ? new Date(data.endsAt) : existing.endsAt;
    if (nextEnds <= nextStarts) throw new ApiError(400, 'End time must be after the start time');
    if (data.endsAt && nextEnds <= now) throw new ApiError(400, 'End time must be in the future');

    if (data.buyNowPrice !== undefined && data.buyNowPrice <= Number(existing.currentBid)) {
      throw new ApiError(400, 'Buy Now price must be higher than the current bid');
    }

    const auction = await prisma.auction.update({
      where: { id: req.params.id },
      data: {
        ...data,
        startsAt: data.startsAt ? nextStarts : undefined,
        endsAt: data.endsAt ? nextEnds : undefined,
        currentBid: bidCount === 0 && data.startingBid !== undefined ? data.startingBid : undefined,
      },
    });
    res.json(auction);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireRole('SELLER'), async (req: AuthedRequest, res, next) => {
  try {
    const existing = await prisma.auction.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { bids: true } }, order: { select: { id: true } } },
    });
    if (!existing) throw new ApiError(404, 'Auction not found');
    if (existing.sellerId !== req.user!.userId) throw new ApiError(403, 'Not your listing');
    if (existing.order) throw new ApiError(409, 'Sold listings cannot be deleted');
    if (existing.status === 'ENDED') throw new ApiError(409, 'Ended auctions cannot be deleted');
    if (existing._count.bids > 0) {
      throw new ApiError(409, 'Listings with bids cannot be deleted. Close the auction instead.');
    }

    await prisma.cartItem.deleteMany({ where: { auctionId: existing.id } });
    await prisma.auction.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/publish', requireAuth, requireRole('SELLER'), requireVerifiedKyc, async (req: AuthedRequest, res, next) => {
  try {
    await requireVerifiedBank(req.user!.userId);
    const existing = await prisma.auction.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'Auction not found');
    if (existing.sellerId !== req.user!.userId) throw new ApiError(403, 'Not your listing');

    const auction = await prisma.auction.update({
      where: { id: req.params.id },
      data: { status: 'LIVE' },
    });
    res.json(auction);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/end-early', requireAuth, requireRole('SELLER'), async (req: AuthedRequest, res, next) => {
  try {
    const existing = await prisma.auction.findUnique({
      where: { id: req.params.id },
      include: { bids: { orderBy: { amount: 'desc' }, take: 1 } },
    });
    if (!existing) throw new ApiError(404, 'Auction not found');
    if (existing.sellerId !== req.user!.userId) throw new ApiError(403, 'Not your listing');
    if (existing.status !== 'LIVE') throw new ApiError(409, 'Only live auctions can be closed early');
    const top = existing.bids[0];
    if (!top) throw new ApiError(409, 'There are no bids to award yet');

    const updated = await finalizeAuction(existing.id, { awardHighest: true });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/buy-now', requireAuth, requireRole('BUYER'), requireVerifiedKyc, async (req: AuthedRequest, res, next) => {
  try {
    const auction = await prisma.auction.findUnique({ where: { id: req.params.id } });
    if (!auction) throw new ApiError(404, 'Auction not found');
    if (auction.status !== 'LIVE') throw new ApiError(409, 'Auction is not live');
    if (!auction.buyNowPrice) throw new ApiError(409, 'This listing has no Buy Now price');
    if (new Date() > auction.endsAt) throw new ApiError(409, 'Auction has ended');

    const updated = await prisma.auction.update({
      where: { id: auction.id },
      data: {
        status: 'ENDED',
        winnerId: req.user!.userId,
        currentBid: auction.buyNowPrice,
        reserveMet: true,
        soldViaBuyNow: true,
        endsAt: new Date(),
      },
    });

    const cart = await prisma.cart.upsert({
      where: { buyerId: req.user!.userId },
      update: {},
      create: { buyerId: req.user!.userId },
    });
    await prisma.cartItem.upsert({
      where: { cartId_auctionId: { cartId: cart.id, auctionId: auction.id } },
      update: {},
      create: { cartId: cart.id, auctionId: auction.id },
    });

    try {
      getIo().to(`auction:${auction.id}`).emit('auction:ended', {
        auctionId: auction.id,
        winnerId: req.user!.userId,
        currentBid: updated.currentBid,
        buyNow: true,
      });
      getIo().emit('market:bid', {
        auctionId: auction.id,
        currentBid: updated.currentBid,
        endsAt: updated.endsAt,
      });
    } catch { /* optional */ }

    await pushNotification(auction.sellerId, 'AUCTION_ENDED', 'Sold via Buy Now', `${auction.title} was purchased at the Buy Now price.`, `/auctions/${auction.slug}`);

    res.json({ auction: updated, addedToCart: true });
  } catch (err) {
    next(err);
  }
});

const flagSchema = z.object({ reason: z.string().min(8) });

router.post('/:id/flag', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { reason } = flagSchema.parse(req.body);
    const auction = await prisma.auction.findUnique({ where: { id: req.params.id } });
    if (!auction) throw new ApiError(404, 'Auction not found');
    const flag = await prisma.auctionFlag.create({
      data: { auctionId: auction.id, reason },
    });
    await prisma.auction.update({ where: { id: auction.id }, data: { status: auction.status === 'LIVE' ? 'FLAGGED' : auction.status } });
    res.status(201).json(flag);
  } catch (err) {
    next(err);
  }
});

export default router;