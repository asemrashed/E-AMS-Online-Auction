import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@e-ams/db';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

const BUYER_OK = new Set(['RECEIVED_CONFIRMED', 'PAYOUT_REQUESTED', 'PAYOUT_COMPLETED']);
const SELLER_OK = new Set(['PAID_ESCROW', 'SHIPPED', 'RECEIVED_CONFIRMED', 'PAYOUT_REQUESTED', 'PAYOUT_COMPLETED']);

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

async function loadOrderForReview(orderId: string, userId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { auction: { select: { sellerId: true, title: true } } },
  });
  if (!order) throw new ApiError(404, 'Order not found');
  const isBuyer = order.buyerId === userId;
  const isSeller = order.auction.sellerId === userId;
  if (!isBuyer && !isSeller) throw new ApiError(403, 'Not your order');
  return { order, isBuyer, isSeller };
}

router.post('/orders/:id', async (req: AuthedRequest, res, next) => {
  try {
    const { rating, comment } = reviewSchema.parse(req.body);
    const userId = req.user!.userId;
    const { order, isBuyer, isSeller } = await loadOrderForReview(req.params.id, userId);

    if (isBuyer && !BUYER_OK.has(order.status)) {
      throw new ApiError(409, 'Confirm receipt before reviewing the seller');
    }
    if (isSeller && !SELLER_OK.has(order.status)) {
      throw new ApiError(409, 'Payment must be confirmed before reviewing the buyer');
    }

    const toUserId = isBuyer ? order.auction.sellerId : order.buyerId;
    const existing = await prisma.review.findUnique({
      where: { orderId_fromUserId: { orderId: order.id, fromUserId: userId } },
    });
    if (existing) throw new ApiError(409, 'You already reviewed this deal');

    const review = await prisma.review.create({
      data: { orderId: order.id, fromUserId: userId, toUserId, rating, comment: comment?.trim() || null },
    });
    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
});

export default router;
