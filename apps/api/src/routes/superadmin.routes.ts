import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@e-ams/db';
import { requireAuth, requireRole, AuthedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth, requireRole('SUPER_ADMIN'));

const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
});

// POST /api/super-admin/admins — create a new ADMIN account
router.post('/admins', async (req: AuthedRequest, res, next) => {
  try {
    const data = createAdminSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ApiError(409, 'Email already in use');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const admin = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        role: 'ADMIN',
        kycStatus: 'VERIFIED',
        createdByAdmin: req.user!.userId,
        emailVerified: true,
      },
      select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    });
    res.status(201).json(admin);
  } catch (err) {
    next(err);
  }
});

// GET /api/super-admin/admins
router.get('/admins', async (_req, res, next) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, email: true, fullName: true, isActive: true, createdAt: true, createdByAdmin: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(admins);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/super-admin/admins/:id/deactivate
router.patch('/admins/:id/deactivate', async (req, res, next) => {
  try {
    const admin = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json(admin);
  } catch (err) {
    next(err);
  }
});

// GET /api/super-admin/commission-report
router.get('/commission-report', async (req, res, next) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const orders = await prisma.order.findMany({
      where: {
        ...where,
        status: { in: ['PAID_ESCROW', 'SHIPPED', 'RECEIVED_CONFIRMED', 'PAYOUT_REQUESTED', 'PAYOUT_COMPLETED'] },
      },
      select: { id: true, finalAmount: true, platformFeeAmt: true, sellerPayoutAmt: true, status: true, createdAt: true, auction: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.finalAmount), 0);
    const totalCommission = orders.reduce((sum, o) => sum + Number(o.platformFeeAmt), 0);

    res.json({ orders, totals: { totalRevenue, totalCommission, orderCount: orders.length } });
  } catch (err) {
    next(err);
  }
});

export default router;
