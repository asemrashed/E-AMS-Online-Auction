import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@e-ams/db';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { pushNotification } from '../services/notification.service';
import { getPublicProfile } from '../utils/publicProfile';

const router = Router();

const meSelect = {
  id: true,
  email: true,
  fullName: true,
  organization: true,
  phone: true,
  bio: true,
  emailVerified: true,
  role: true,
  kycStatus: true,
  kycDocumentUrls: true,
  avatarUrl: true,
  mfaEnabled: true,
  createdAt: true,
  bankAccount: true,
  addresses: { take: 1 },
} as const;

router.get('/:id/profile', async (req, res, next) => {
  try {
    const profile = await getPublicProfile(req.params.id);
    if (!profile) throw new ApiError(404, 'User not found');
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.use(requireAuth);

router.get('/me', async (req: AuthedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: meSelect,
    });
    if (!user) throw new ApiError(404, 'User not found');
    const { addresses, ...rest } = user;
    res.json({ ...rest, address: addresses[0] ?? null });
  } catch (err) {
    next(err);
  }
});

const profileSchema = z.object({
  avatarUrl: z.string().url().nullable().optional(),
  fullName: z.string().min(2).optional(),
  organization: z.string().max(120).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  address: z.object({
    line1: z.string().min(2),
    city: z.string().min(2),
    state: z.string().min(2),
    country: z.string().min(2),
  }).optional(),
});

router.patch('/me', async (req: AuthedRequest, res, next) => {
  try {
    const body = profileSchema.parse(req.body);
    const { address, ...profile } = body;
    const userId = req.user!.userId;

    if (address) {
      const existing = await prisma.address.findFirst({ where: { userId } });
      if (existing) await prisma.address.update({ where: { id: existing.id }, data: address });
      else await prisma.address.create({ data: { ...address, userId } });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: profile,
      select: meSelect,
    });
    const { addresses, ...rest } = user;
    res.json({ ...rest, address: addresses[0] ?? null });
  } catch (err) {
    next(err);
  }
});

const kycSchema = z.object({
  documents: z.array(z.string().url()).min(1, 'Upload at least one document'),
});

router.post('/kyc/submit', async (req: AuthedRequest, res, next) => {
  try {
    const { documents } = kycSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { kycStatus: 'PENDING', kycDocumentUrls: documents },
    });
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        pushNotification(
          admin.id,
          'KYC_SUBMITTED',
          'KYC documents submitted',
          `${user.fullName} submitted KYC documents for review.`,
          '/admin/users'
        )
      )
    );
    res.json({ message: 'KYC documents submitted for review', kycStatus: user.kycStatus });
  } catch (err) {
    next(err);
  }
});

router.get('/kyc/status', async (req: AuthedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { kycStatus: true, kycDocumentUrls: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
