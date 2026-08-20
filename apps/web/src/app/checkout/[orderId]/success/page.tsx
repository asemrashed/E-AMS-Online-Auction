'use client';

import Link from 'next/link';
import { useOrderQuery } from '@/hooks/useApi';

export default function CheckoutSuccessPage({ params }: { params: { orderId: string } }) {
  const { data: order } = useOrderQuery(params.orderId);
  return (
    <main className="max-w-xl mx-auto px-margin-desktop py-16 text-center">
      <h1 className="text-headline-lg mb-3">Payment received</h1>
      <p className="text-body-md text-on-surface-variant mb-6">
        {order ? `${order.auction?.title} is in escrow (${order.status.replace(/_/g, ' ')}).` : 'Confirming your order…'}
      </p>
      <div className="flex justify-center gap-3">
        <Link href="/dashboard/orders" className="btn-primary">View orders</Link>
        <Link href="/auctions" className="btn-secondary">Continue browsing</Link>
      </div>
    </main>
  );
}