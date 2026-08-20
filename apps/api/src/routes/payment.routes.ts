import { Router } from 'express';
import express from 'express';
import { prisma } from '@e-ams/db';
import { requireAuth, requireRole, AuthedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { stripeService } from '../services/payment/stripe.service';
import { sslcommerzService } from '../services/payment/sslcommerz.service';
import { pushNotification } from '../services/notification.service';

const router = Router();

async function loadOrderForCheckout(orderId: string, buyerId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { auction: true } });
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.buyerId !== buyerId) throw new ApiError(403, 'Not your order');
  if (order.status !== 'AWAITING_PAYMENT') throw new ApiError(409, 'Order is not awaiting payment');
  return order;
}

// POST /api/payments/checkout/stripe  { orderId }
router.post('/checkout/stripe', requireAuth, requireRole('BUYER'), express.json(), async (req: AuthedRequest, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await loadOrderForCheckout(orderId, req.user!.userId);
    const buyer = await prisma.user.findUnique({ where: { id: req.user!.userId } });

    const session = await stripeService.createSession({
      orderId: order.id,
      amount: Number(order.finalAmount),
      currency: 'usd',
      customerEmail: buyer!.email,
    });

    await prisma.payment.upsert({
      where: { orderId: order.id },
      update: { gateway: 'STRIPE', amount: order.finalAmount, providerRef: session.sessionId },
      create: { orderId: order.id, gateway: 'STRIPE', amount: order.finalAmount, providerRef: session.sessionId },
    });

    res.json(session);
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/checkout/sslcommerz  { orderId }
router.post('/checkout/sslcommerz', requireAuth, requireRole('BUYER'), express.json(), async (req: AuthedRequest, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await loadOrderForCheckout(orderId, req.user!.userId);
    const buyer = await prisma.user.findUnique({ where: { id: req.user!.userId } });

    const session = await sslcommerzService.createSession({
      orderId: order.id,
      amount: Number(order.finalAmount),
      currency: 'BDT',
      customerEmail: buyer!.email,
    });

    await prisma.payment.upsert({
      where: { orderId: order.id },
      update: { gateway: 'SSLCOMMERZ', amount: order.finalAmount, providerRef: session.sessionId },
      create: { orderId: order.id, gateway: 'SSLCOMMERZ', amount: order.finalAmount, providerRef: session.sessionId },
    });

    res.json(session);
  } catch (err) {
    next(err);
  }
});

async function markOrderPaid(orderId: string, providerRef: string) {
  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) throw new ApiError(404, 'Order not found');
  if (existing.status !== 'AWAITING_PAYMENT') {
    return existing;
  }
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status: 'PAID_ESCROW', paidAt: new Date() },
    include: { auction: true },
  });
  await prisma.payment.update({ where: { orderId }, data: { status: 'PAID', providerRef } });
  await pushNotification(order.buyerId, 'PAYMENT_CONFIRMED', 'Payment received', `Your payment for ${order.auction.title} is held securely in escrow.`, '/dashboard/orders');
  await pushNotification(order.auction.sellerId, 'PAYMENT_CONFIRMED', 'Item sold & paid', `${order.auction.title} has been paid for — please prepare it for shipment.`, '/dashboard/sales');
  return order;
}

// POST /api/payments/webhook/stripe — raw body required for signature verification
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'] as string | undefined;
  const result = await stripeService.verifyWebhook(req.body, signature);
  if (!result) return res.status(400).send('Webhook verification failed');
  await markOrderPaid(result.orderId, result.providerRef);
  res.json({ received: true });
});

// POST /api/payments/webhook/sslcommerz — form-encoded IPN
router.post('/webhook/sslcommerz', express.urlencoded({ extended: true }), async (req, res) => {
  const result = await sslcommerzService.verifyWebhook(req.body, undefined);
  if (!result) return res.status(400).send('Webhook verification failed');
  await markOrderPaid(result.orderId, result.providerRef);
  res.redirect(`${process.env.WEB_URL}/checkout/${result.orderId}/success`);
});

export default router;
