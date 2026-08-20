export interface CheckoutSession {
  sessionId: string;
  redirectUrl: string;
}

export interface PaymentService {
  /** Creates a hosted checkout/payment session for the given order. */
  createSession(params: { orderId: string; amount: number; currency: string; customerEmail: string }): Promise<CheckoutSession>;

  /** Verifies an inbound webhook payload/signature. Returns the orderId + paid amount if valid. */
  verifyWebhook(rawBody: any, signature: string | undefined): Promise<{ orderId: string; amount: number; providerRef: string } | null>;

  /** Issues a refund for a previously captured payment. */
  refund(providerRef: string, amount: number): Promise<void>;
}
