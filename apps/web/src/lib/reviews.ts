import type { Order, Role } from '@/lib/schemas';

const BUYER_READY = new Set(['RECEIVED_CONFIRMED', 'PAYOUT_REQUESTED', 'PAYOUT_COMPLETED']);
const SELLER_READY = new Set(['PAID_ESCROW', 'SHIPPED', 'RECEIVED_CONFIRMED', 'PAYOUT_REQUESTED', 'PAYOUT_COMPLETED']);

export function myReview(order: Order, userId?: string) {
  if (!userId) return undefined;
  return order.reviews?.find((r) => r.fromUserId === userId);
}

export function canReviewOrder(order: Order, role?: Role, userId?: string) {
  if (!role || !userId || myReview(order, userId)) return false;
  if (role === 'BUYER') return BUYER_READY.has(order.status);
  if (role === 'SELLER') return SELLER_READY.has(order.status);
  return false;
}

export function counterpart(order: Order, role?: Role) {
  if (role === 'BUYER') return order.auction?.seller;
  return order.buyer;
}
