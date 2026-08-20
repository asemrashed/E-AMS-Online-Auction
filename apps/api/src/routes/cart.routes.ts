import { Router } from 'express';
import { prisma } from '@e-ams/db';
import { requireAuth, requireRole, AuthedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { addAuctionToCart } from '../services/cart.service';

const router = Router();
router.use(requireAuth, requireRole('BUYER'));

router.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const cart = await prisma.cart.findUnique({
      where: { buyerId: req.user!.userId },
      include: { items: { include: { auction: true } } },
    });
    res.json(cart ?? { items: [] });
  } catch (err) {
    next(err);
  }
});

router.post('/:auctionId', async (req: AuthedRequest, res, next) => {
  try {
    const item = await addAuctionToCart(req.user!.userId, req.params.auctionId);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.delete('/:auctionId', async (req: AuthedRequest, res, next) => {
  try {
    const cart = await prisma.cart.findUnique({ where: { buyerId: req.user!.userId } });
    if (!cart) throw new ApiError(404, 'Cart not found');
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id, auctionId: req.params.auctionId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;