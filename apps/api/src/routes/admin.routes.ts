import { Router } from 'express';
import { prisma } from '@e-ams/db';
import { requireAuth, requireAdmin, AuthedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { pushNotification } from '../services/notification.service';

const router = Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/users — search/list users, filter by role/kyc
router.get('/users', async (req, res, next) => {
  try {
    const { role, kycStatus, search } = req.query as Record<string, string>;
    const where: any = {};
    if (role) where.role = role;
    if (kycStatus) where.kycStatus = kycStatus;
    if (search) where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { fullName: { contains: search, mode: 'insensitive' } },
    ];

    const users = await prisma.user.findMany({
      where,
      select: { id: true, email: true, fullName: true, organization: true, role: true, kycStatus: true, kycDocumentUrls: true, isActive: true, createdAt: true, bankAccount: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id — update KYC status, suspend/reinstate
router.patch('/users/:id', async (req, res, next) => {
  try {
    const { kycStatus, isActive } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { kycStatus, isActive },
    });
    if (kycStatus) {
      await pushNotification(user.id, 'KYC_UPDATE', 'KYC status updated', `Your verification status is now ${kycStatus}.`, '/dashboard/kyc');
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/bank/:sellerId/verify — verify a seller's bank account
router.patch('/bank/:sellerId/verify', async (req, res, next) => {
  try {
    const bank = await prisma.bankAccount.update({
      where: { sellerId: req.params.sellerId },
      data: { verified: true },
    });
    res.json(bank);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/flags — flagged/reported auctions
router.get('/flags', async (_req, res, next) => {
  try {
    const flags = await prisma.auctionFlag.findMany({
      where: { resolvedAt: null },
      include: { auction: { include: { seller: { select: { fullName: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(flags);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/flags/:id — resolve a flag (optionally cancel/pull the auction)
router.patch('/flags/:id', async (req: AuthedRequest, res, next) => {
  try {
    const { pullAuction } = req.body;
    const flag = await prisma.auctionFlag.update({
      where: { id: req.params.id },
      data: { resolvedBy: req.user!.userId, resolvedAt: new Date() },
    });
    if (pullAuction) {
      await prisma.auction.update({ where: { id: flag.auctionId }, data: { status: 'CANCELLED' } });
    } else {
      const auction = await prisma.auction.findUnique({ where: { id: flag.auctionId } });
      if (auction?.status === 'FLAGGED') {
        const stillLive = auction.endsAt > new Date();
        await prisma.auction.update({ where: { id: auction.id }, data: { status: stillLive ? 'LIVE' : 'ENDED' } });
      }
    }
    res.json(flag);
  } catch (err) {
    next(err);
  }
});

router.get('/banks', async (_req, res, next) => {
  try {
    const banks = await prisma.bankAccount.findMany({
      include: { seller: { select: { id: true, fullName: true, email: true, organization: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(banks);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/analytics — headline platform metrics
router.get('/analytics', async (_req, res, next) => {
  try {
    const [activeUsers, flaggedCount, revenueAgg, liveAuctions] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.auctionFlag.count({ where: { resolvedAt: null } }),
      prisma.order.aggregate({ _sum: { platformFeeAmt: true }, where: { status: { in: ['PAID_ESCROW', 'SHIPPED', 'RECEIVED_CONFIRMED', 'PAYOUT_REQUESTED', 'PAYOUT_COMPLETED'] } } }),
      prisma.auction.count({ where: { status: 'LIVE' } }),
    ]);
    res.json({
      activeUsers,
      flaggedAuctions: flaggedCount,
      platformRevenue: revenueAgg._sum.platformFeeAmt ?? 0,
      liveAuctions,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
