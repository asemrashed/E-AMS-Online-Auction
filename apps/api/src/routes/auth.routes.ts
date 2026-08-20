import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { generateSecret, generateURI, verifySync } from 'otplib';
import { prisma } from '@e-ams/db';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { ApiError } from '../middleware/errorHandler';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { consumeEmailOtp, issueEmailOtp } from '../services/email.service';

const router = Router();

function authPayload(user: { id: string; email: string; fullName: string; role: string; kycStatus: string; avatarUrl: string | null; emailVerified?: boolean }) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    kycStatus: user.kycStatus,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified ?? true,
  };
}

async function findUserByEmail(email: string) {
  const trimmed = email.trim();
  const lower = trimmed.toLowerCase();
  return (await prisma.user.findUnique({ where: { email: lower } }))
    ?? (lower === trimmed ? null : await prisma.user.findUnique({ where: { email: trimmed } }));
}

function tokensFor(user: { id: string; role: 'BUYER' | 'SELLER' | 'ADMIN' | 'SUPER_ADMIN' }) {
  return {
    accessToken: signAccessToken({ userId: user.id, role: user.role }),
    refreshToken: signRefreshToken({ userId: user.id, role: user.role }),
  };
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2),
  organization: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['BUYER', 'SELLER']),
});

router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const email = data.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, 'An account with this email already exists');

    const passwordHash = await bcrypt.hash(data.password, 10);

    await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: data.fullName,
        organization: data.organization,
        phone: data.phone,
        role: data.role,
        emailVerified: false,
        cart: data.role === 'BUYER' ? { create: {} } : undefined,
      },
    });

    await issueEmailOtp(email, 'VERIFY_EMAIL');

    res.status(201).json({
      emailVerificationRequired: true,
      email,
      message: 'We sent a 5-character code to your email. Verify to continue.',
    });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await findUserByEmail(email);
    if (!user) throw new ApiError(401, 'Invalid email or password');
    if (!user.isActive) throw new ApiError(403, 'This account has been suspended');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new ApiError(401, 'Invalid email or password');

    if (!user.emailVerified) {
      try {
        await issueEmailOtp(user.email, 'VERIFY_EMAIL');
      } catch {
        /* already recently sent */
      }
      return res.json({
        emailVerificationRequired: true,
        email: user.email,
        message: 'Verify your email with the 5-character code we sent.',
      });
    }

    if (user.mfaEnabled) {
      return res.json({ mfaRequired: true, userId: user.id });
    }

    res.json({
      user: authPayload(user),
      ...tokensFor(user),
    });
  } catch (err) {
    next(err);
  }
});

const otpSchema = z.object({
  email: z.string().email(),
  code: z.string().min(5).max(5),
});

router.post('/verify-email', async (req, res, next) => {
  try {
    const { email, code } = otpSchema.parse(req.body);
    const user = await findUserByEmail(email);
    if (!user) throw new ApiError(400, 'Invalid or expired code');
    await consumeEmailOtp(user.email, 'VERIFY_EMAIL', code);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    res.json({
      user: authPayload(updated),
      ...tokensFor(updated),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/resend-verification', async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await findUserByEmail(email);
    if (user && !user.emailVerified) await issueEmailOtp(user.email, 'VERIFY_EMAIL');
    res.json({ message: 'If this account needs verification, a new code is on its way.' });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await findUserByEmail(email);
    if (user && user.isActive) await issueEmailOtp(user.email, 'RESET_PASSWORD');
    res.json({ message: 'If an account exists for that email, we sent a reset code.' });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, code, password } = z.object({
      email: z.string().email(),
      code: z.string().min(5).max(5),
      password: z.string().min(8, 'Password must be at least 8 characters'),
    }).parse(req.body);
    const user = await findUserByEmail(email);
    if (!user) throw new ApiError(400, 'Invalid or expired code');
    await consumeEmailOtp(user.email, 'RESET_PASSWORD', code);
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    res.json({ message: 'Password updated. You can log in with your new password.' });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new ApiError(400, 'refreshToken required');
    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) throw new ApiError(401, 'Invalid or expired refresh token');
    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    res.json({ accessToken, user: authPayload(user) });
  } catch {
    next(new ApiError(401, 'Invalid or expired refresh token'));
  }
});

router.post('/mfa/setup', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new ApiError(404, 'User not found');
    const secret = generateSecret();
    await prisma.user.update({ where: { id: user.id }, data: { mfaSecret: secret, mfaEnabled: false } });
    const otpauthUrl = generateURI({ issuer: 'e-AMS', label: user.email, secret });
    res.json({ secret, otpauthUrl });
  } catch (err) {
    next(err);
  }
});

router.post('/mfa/enable', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { code } = z.object({ code: z.string().min(6) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user?.mfaSecret) throw new ApiError(400, 'Run MFA setup first');
    const ok = verifySync({ secret: user.mfaSecret, token: code });
    if (!ok.valid) throw new ApiError(401, 'Invalid authenticator code');
    await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: true } });
    res.json({ mfaEnabled: true });
  } catch (err) {
    next(err);
  }
});

router.post('/mfa/verify', async (req, res, next) => {
  try {
    const { userId, code } = z.object({ userId: z.string(), code: z.string().min(6) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaEnabled || !user.mfaSecret) throw new ApiError(400, 'MFA is not enabled for this account');
    const ok = verifySync({ secret: user.mfaSecret, token: code });
    if (!ok.valid) throw new ApiError(401, 'Invalid authenticator code');

    res.json({
      user: authPayload(user),
      ...tokensFor(user),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
