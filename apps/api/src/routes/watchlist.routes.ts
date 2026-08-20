import { Router } from 'express';
import { prisma } from '@e-ams/db';
import { requireAuth, requireRole, AuthedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth, requireRole('BUYER'));

router.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const items = await prisma.watchlist.findMany({
      where: { userId: req.user!.userId },
      include: { auction: { include: { seller: { select: { fullName: true, organization: true } }, _count: { select: { bids: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post('/:auctionId', async (req: AuthedRequest, res, next) => {
  try {
    const auction = await prisma.auction.findUnique({ where: { id: req.params.auctionId } });
    if (!auction) throw new ApiError(404, 'Auction not found');
    const item = await prisma.watchlist.upsert({
      where: { userId_auctionId: { userId: req.user!.userId, auctionId: auction.id } },
      update: {},
      create: { userId: req.user!.userId, auctionId: auction.id },
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.delete('/:auctionId', async (req: AuthedRequest, res, next) => {
  try {
    await prisma.watchlist.deleteMany({
      where: { userId: req.user!.userId, auctionId: req.params.auctionId },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;