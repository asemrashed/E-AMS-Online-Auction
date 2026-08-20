import { Router } from 'express';
import { prisma } from '@e-ams/db';
import { requireAuth, requireRole, requireAdmin, AuthedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { pushNotification } from '../services/notification.service';

const router = Router();

router.post('/orders/:orderId/claim', requireAuth, requireRole('SELLER'), async (req: AuthedRequest, res, next) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.orderId }, include: { auction: true } });
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.auction.sellerId !== req.user!.userId) throw new ApiError(403, 'Not your sale');
    if (order.status !== 'RECEIVED_CONFIRMED') {
      throw new ApiError(409, 'Payout can only be claimed after the buyer confirms receipt');
    }

    const bank = await prisma.bankAccount.findUnique({ where: { sellerId: req.user!.userId } });
    if (!bank?.verified) throw new ApiError(412, 'Your bank account must be verified before requesting a payout');

    const payout = await prisma.payout.create({
      data: { orderId: order.id, sellerId: req.user!.userId, amount: order.sellerPayoutAmt },
    });

    await prisma.order.update({ where: { id: order.id }, data: { status: 'PAYOUT_REQUESTED', payoutRequestedAt: new Date() } });

    res.status(201).json(payout);
  } catch (err) {
    next(err);
  }
});

router.get('/mine', requireAuth, requireRole('SELLER'), async (req: AuthedRequest, res, next) => {
  try {
    const payouts = await prisma.payout.findMany({
      where: { sellerId: req.user!.userId },
      include: { order: { include: { auction: true } } },
      orderBy: { requestedAt: 'desc' },
    });
    res.json(payouts);
  } catch (err) {
    next(err);
  }
});

router.get('/', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const payouts = await prisma.payout.findMany({
      where: { status: { in: ['REQUESTED', 'APPROVED'] } },
      include: { order: { include: { auction: true } } },
      orderBy: { requestedAt: 'asc' },
    });
    res.json(payouts);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/approve', requireAuth, requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const existing = await prisma.payout.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'Payout not found');
    if (existing.status !== 'REQUESTED') throw new ApiError(409, 'Only requested payouts can be approved');
    const payout = await prisma.payout.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', approvedBy: req.user!.userId },
    });
    await pushNotification(payout.sellerId, 'PAYOUT_APPROVED', 'Payout approved', `Your payout of $${payout.amount} was approved. Funds will be marked paid after the bank transfer is recorded.`, '/dashboard/payouts');
    res.json(payout);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/pay', requireAuth, requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const existing = await prisma.payout.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'Payout not found');
    if (existing.status !== 'APPROVED') throw new ApiError(409, 'Approve the payout before recording payment');
    const payout = await prisma.payout.update({
      where: { id: req.params.id },
      data: { status: 'PAID', paidAt: new Date() },
    });
    await prisma.order.update({ where: { id: payout.orderId }, data: { status: 'PAYOUT_COMPLETED', payoutCompletedAt: new Date() } });
    await pushNotification(payout.sellerId, 'PAYOUT_APPROVED', 'Payout recorded', `Your payout of $${payout.amount} has been recorded as paid (manual bank transfer).`, '/dashboard/payouts');
    res.json(payout);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/reject', requireAuth, requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const { reason } = req.body;
    const payout = await prisma.payout.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', approvedBy: req.user!.userId },
    });
    await prisma.order.update({
      where: { id: payout.orderId },
      data: { status: 'RECEIVED_CONFIRMED', payoutRequestedAt: null },
    });
    await prisma.payout.delete({ where: { id: payout.id } });
    await pushNotification(payout.sellerId, 'PAYOUT_REJECTED', 'Payout request rejected', reason || 'Contact support for details.', '/dashboard/payouts');
    res.json(payout);
  } catch (err) {
    next(err);
  }
});

export default router;