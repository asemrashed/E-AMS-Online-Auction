import Stripe from 'stripe';
import { PaymentService } from './payment.interface';

function getStripe() {
  const key = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!key || key.includes('...')) {
    throw new Error(
      'Stripe is not configured. Add your test secret key from https://dashboard.stripe.com/test/apikeys as STRIPE_SECRET_KEY in the repo root .env, then restart the API.'
    );
  }
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

export const stripeService: PaymentService = {
  async createSession({ orderId, amount, currency, customerEmail }) {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: { name: `e-AMS Order ${orderId}` },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: { orderId },
      success_url: `${process.env.WEB_URL}/checkout/${orderId}/success`,
      cancel_url: `${process.env.WEB_URL}/checkout/${orderId}`,
    });

    return { sessionId: session.id, redirectUrl: session.url! };
  },

  async verifyWebhook(rawBody, signature) {
    if (!signature) return null;
    try {
      const event = getStripe().webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        if (!orderId) return null;
        return {
          orderId,
          amount: (session.amount_total ?? 0) / 100,
          providerRef: session.payment_intent as string,
        };
      }
      return null;
    } catch (err) {
      console.error('Stripe webhook verification failed', err);
      return null;
    }
  },

  async refund(providerRef, amount) {
    await getStripe().refunds.create({ payment_intent: providerRef, amount: Math.round(amount * 100) });
  },
};
