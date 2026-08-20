import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@e-ams/db';
import { requireAuth, requireRole, AuthedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth, requireRole('SELLER'));

const bankSchema = z.object({
  accountName: z.string().min(2),
  accountNumber: z.string().min(4),
  bankName: z.string().min(2),
  routingOrBranch: z.string().min(2),
});

// GET /api/seller/bank
router.get('/bank', async (req: AuthedRequest, res, next) => {
  try {
    const bank = await prisma.bankAccount.findUnique({ where: { sellerId: req.user!.userId } });
    res.json(bank);
  } catch (err) {
    next(err);
  }
});

// POST /api/seller/bank — create (required before first listing)
router.post('/bank', async (req: AuthedRequest, res, next) => {
  try {
    const data = bankSchema.parse(req.body);
    const existing = await prisma.bankAccount.findUnique({ where: { sellerId: req.user!.userId } });
    if (existing) throw new ApiError(409, 'Bank account already exists — use PATCH to update it');

    const bank = await prisma.bankAccount.create({
      data: { ...data, sellerId: req.user!.userId },
    });
    res.status(201).json(bank);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/seller/bank
router.patch('/bank', async (req: AuthedRequest, res, next) => {
  try {
    const data = bankSchema.partial().parse(req.body);
    // Editing re-triggers admin verification
    const bank = await prisma.bankAccount.update({
      where: { sellerId: req.user!.userId },
      data: { ...data, verified: false },
    });
    res.json(bank);
  } catch (err) {
    next(err);
  }
});

// GET /api/seller/listings — my listings across all statuses
router.get('/listings', async (req: AuthedRequest, res, next) => {
  try {
    const listings = await prisma.auction.findMany({
      where: { sellerId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { bids: true } } },
    });
    res.json(listings);
  } catch (err) {
    next(err);
  }
});

// GET /api/seller/sales — orders for my sold items
router.get('/sales', async (req: AuthedRequest, res, next) => {
  try {
    const sales = await prisma.order.findMany({
      where: { auction: { sellerId: req.user!.userId } },
      include: {
        auction: true,
        buyer: { select: { id: true, fullName: true, organization: true, avatarUrl: true } },
        payout: true,
        reviews: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sales);
  } catch (err) {
    next(err);
  }
});

export default router;
