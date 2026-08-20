import fetch from 'node-fetch';
import { PaymentService } from './payment.interface';

const BASE_SANDBOX = 'https://sandbox.sslcommerz.com';
const BASE_LIVE = 'https://securepay.sslcommerz.com';

function sslConfig() {
  const storeId = (process.env.SSLCOMMERZ_STORE_ID || '').trim();
  const storePasswd = (process.env.SSLCOMMERZ_STORE_PASSWORD || '').trim();
  if (!storeId || !storePasswd) {
    throw new Error(
      'SSLCommerz is not configured. Set SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD in the repo root .env (sandbox: testbox / qwerty), then restart the API.'
    );
  }
  return {
    storeId,
    storePasswd,
    isLive: process.env.SSLCOMMERZ_IS_LIVE === 'true',
  };
}

export const sslcommerzService: PaymentService = {
  async createSession({ orderId, amount, currency, customerEmail }) {
    const { storeId, storePasswd, isLive } = sslConfig();
    const bdtRate = Number(process.env.USD_TO_BDT_RATE || 130);
    const payAmount = currency === 'BDT' || currency === 'bdt' ? amount : +(amount * bdtRate).toFixed(2);
    const params = new URLSearchParams({
      store_id: storeId,
      store_passwd: storePasswd,
      total_amount: String(payAmount),
      currency: 'BDT',
      tran_id: orderId,
      success_url: `${process.env.API_URL}/api/payments/webhook/sslcommerz`,
      fail_url: `${process.env.WEB_URL}/checkout/${orderId}?status=failed`,
      cancel_url: `${process.env.WEB_URL}/checkout/${orderId}?status=cancelled`,
      cus_email: customerEmail,
      cus_name: customerEmail,
      cus_add1: 'N/A',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      cus_phone: '01700000000',
      shipping_method: 'NO',
      product_name: `e-AMS Order ${orderId}`.slice(0, 80),
      product_category: 'Auction',
      product_profile: 'general',
    });

    const resp = await fetch(`${isLive ? BASE_LIVE : BASE_SANDBOX}/gwprocess/v4/api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    const data = (await resp.json()) as { status?: string; failedreason?: string; sessionkey?: string; GatewayPageURL?: string };

    if (data.status !== 'SUCCESS' || !data.GatewayPageURL) {
      throw new Error(`SSLCommerz session creation failed: ${data.failedreason || 'unknown error'}`);
    }

    return { sessionId: data.sessionkey || '', redirectUrl: data.GatewayPageURL };
  },

  async verifyWebhook(rawBody) {
    const body = rawBody as Record<string, string>;
    if (body.status !== 'VALID' && body.status !== 'VALIDATED') return null;
    return {
      orderId: body.tran_id,
      amount: Number(body.amount),
      providerRef: body.val_id,
    };
  },

  async refund() {
    throw new Error('SSLCommerz refunds must be processed manually via the merchant panel');
  },
};
