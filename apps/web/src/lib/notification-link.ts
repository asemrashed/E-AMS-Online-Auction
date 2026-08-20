import type { Notification } from '@/lib/schemas';

export function notificationHref(n: Pick<Notification, 'type' | 'link'>): string | null {
  if (n.link) return n.link;
  switch (n.type) {
    case 'OUTBID':
    case 'AUCTION_ENDED':
    case 'AUCTION_WON':
      return '/auctions';
    case 'KYC_UPDATE':
      return '/dashboard/kyc';
    case 'KYC_SUBMITTED':
      return '/admin/users';
    case 'PAYOUT_APPROVED':
    case 'PAYOUT_REJECTED':
      return '/dashboard/payouts';
    case 'PAYMENT_CONFIRMED':
    case 'ORDER_SHIPPED':
    case 'ORDER_RECEIVED':
      return '/dashboard/orders';
    default:
      return null;
  }
}
