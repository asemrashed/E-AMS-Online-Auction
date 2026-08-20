import { Router } from 'express';
import { prisma } from '@e-ams/db';
import { requireAuth, requireRole, AuthedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { pushNotification } from '../services/notification.service';

const router = Router();
router.use(requireAuth);

const PLATFORM_FEE_PCT = Number(process.env.PLATFORM_FEE_PCT || 5);

router.get('/', requireRole('BUYER'), async (req: AuthedRequest, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { buyerId: req.user!.userId },
      include: {
        auction: { include: { seller: { select: { id: true, fullName: true, avatarUrl: true } } } },
        payment: true,
        reviews: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

router.post('/:auctionId/checkout', requireRole('BUYER'), async (req: AuthedRequest, res, next) => {
  try {
    const auction = await prisma.auction.findUnique({ where: { id: req.params.auctionId } });
    if (!auction) throw new ApiError(404, 'Auction not found');
    if (auction.status !== 'ENDED') throw new ApiError(409, 'Auction must be ended before checkout');
    if (auction.winnerId !== req.user!.userId) throw new ApiError(403, 'Only the winning bidder can check out');

    const existingOrder = await prisma.order.findUnique({ where: { auctionId: auction.id } });
    if (existingOrder) return res.json(existingOrder);

    const finalAmount = Number(auction.currentBid);
    const platformFeeAmt = +(finalAmount * (PLATFORM_FEE_PCT / 100)).toFixed(2);
    const sellerPayoutAmt = +(finalAmount - platformFeeAmt).toFixed(2);

    const order = await prisma.order.create({
      data: {
        auctionId: auction.id,
        buyerId: req.user!.userId,
        finalAmount,
        platformFeePct: PLATFORM_FEE_PCT,
        platformFeeAmt,
        sellerPayoutAmt,
      },
    });

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        auction: { include: { seller: { select: { id: true, fullName: true, avatarUrl: true } } } },
        buyer: { select: { id: true, fullName: true, avatarUrl: true } },
        payment: true,
        payout: true,
        reviews: true,
      },
    });
    if (!order) throw new ApiError(404, 'Order not found');

    const isBuyer = order.buyerId === req.user!.userId;
    const isSeller = order.auction.sellerId === req.user!.userId;
    const isStaff = req.user!.role === 'ADMIN' || req.user!.role === 'SUPER_ADMIN';
    if (!isBuyer && !isSeller && !isStaff) throw new ApiError(403, 'Not your order');

    res.json(order);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/ship', requireRole('SELLER'), async (req: AuthedRequest, res, next) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { auction: true } });
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.auction.sellerId !== req.user!.userId) throw new ApiError(403, 'Not your sale');
    if (order.status !== 'PAID_ESCROW') throw new ApiError(409, 'Order must be paid before shipping');

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'SHIPPED', shippedAt: new Date() },
      include: {
        auction: { include: { seller: { select: { id: true, fullName: true } } } },
        buyer: { select: { id: true, fullName: true } },
        reviews: true,
      },
    });

    await pushNotification(order.buyerId, 'ORDER_SHIPPED', 'Your item has shipped', `${order.auction.title} is on its way.`, '/dashboard/orders');
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/confirm-payment', requireRole('SELLER'), async (req: AuthedRequest, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { auction: true, buyer: { select: { id: true, fullName: true } }, reviews: true },
    });
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.auction.sellerId !== req.user!.userId) throw new ApiError(403, 'Not your sale');
    if (order.status === 'AWAITING_PAYMENT') throw new ApiError(409, 'Buyer has not paid yet');

    res.json({
      ...order,
      promptReview: true,
      reviewTarget: { id: order.buyer.id, fullName: order.buyer.fullName },
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/confirm-receipt', requireRole('BUYER'), async (req: AuthedRequest, res, next) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { auction: true } });
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.buyerId !== req.user!.userId) throw new ApiError(403, 'Not your order');
    if (order.status !== 'SHIPPED') throw new ApiError(409, 'Order must be marked shipped first');

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'RECEIVED_CONFIRMED', receivedConfirmedAt: new Date() },
      include: {
        auction: { include: { seller: { select: { id: true, fullName: true } } } },
        reviews: true,
      },
    });

    await pushNotification(
      order.auction.sellerId,
      'ORDER_RECEIVED',
      'Buyer confirmed receipt',
      `${order.auction.title} was confirmed received — you can now claim your payout.`,
      '/dashboard/payouts'
    );
    res.json({
      ...updated,
      promptReview: true,
      reviewTarget: { id: order.auction.sellerId, fullName: updated.auction.seller.fullName },
    });
  } catch (err) {
    next(err);
  }
});

export default router;