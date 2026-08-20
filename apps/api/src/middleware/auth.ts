import { Request, Response, NextFunction } from 'express';
import { prisma } from '@e-ams/db';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { ApiError } from './errorHandler';

export interface AuthedRequest extends Request {
  user?: JwtPayload;
}

/** Verifies the Bearer token and attaches `req.user`. 401 if missing/invalid. */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }
  try {
    const token = header.slice(7);
    req.user = verifyAccessToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Restricts a route to one or more roles. Use after requireAuth. */
export function requireRole(...roles: JwtPayload['role'][]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden — requires role: ${roles.join(' or ')}` });
    }
    next();
  };
}

/** ADMIN and SUPER_ADMIN both pass */
export const requireAdmin = requireRole('ADMIN', 'SUPER_ADMIN');

export async function requireVerifiedKyc(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') return next();
    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { kycStatus: true, isActive: true } });
    if (!user) throw new ApiError(404, 'User not found');
    if (!user.isActive) throw new ApiError(403, 'This account has been suspended');
    if (user.kycStatus !== 'VERIFIED') {
      throw new ApiError(412, 'Complete KYC verification before bidding or publishing listings.');
    }
    next();
  } catch (err) {
    next(err);
  }
}