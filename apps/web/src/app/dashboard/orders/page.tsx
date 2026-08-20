'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { keys, useOrdersQuery } from '@/hooks/useApi';
import { useAuthStore } from '@/store/auth';
import type { Order } from '@/lib/schemas';
import { ReviewModal } from '@/components/ReviewModal';
import { canReviewOrder, counterpart, myReview } from '@/lib/reviews';

const STATUS_LABEL: Record<Order['status'], string> = {
  AWAITING_PAYMENT: 'Awaiting Payment',
  PAID_ESCROW: 'Paid — In Escrow',
  SHIPPED: 'Shipped',
  RECEIVED_CONFIRMED: 'Receipt Confirmed',
  PAYOUT_REQUESTED: 'Payout Requested',
  PAYOUT_COMPLETED: 'Completed',
  DISPUTED: 'Disputed',
  REFUNDED: 'Refunded',
  CANCELLED: 'Cancelled',
};

export default function OrdersPage() {
  const user = useAuthStore((s) => s.user);
  const { data: orders = [], isLoading } = useOrdersQuery(user?.role === 'BUYER');
  const qc = useQueryClient();
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const confirm = useMutation({
    mutationFn: (id: string) => api.patch<Order>(`/api/orders/${id}/confirm-receipt`),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: keys.orders });
      if (order.promptReview) setReviewOrder(order);
    },
  });
  const review = useMutation({
    mutationFn: (payload: { orderId: string; rating: number; comment: string }) =>
      api.post(`/api/reviews/orders/${payload.orderId}`, { rating: payload.rating, comment: payload.comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.orders });
      setReviewOrder(null);
      setReviewError(null);
    },
    onError: (e: Error) => setReviewError(e.message),
  });

  const target = reviewOrder ? counterpart(reviewOrder, 'BUYER') : null;

  return (
    <div>
      <h1 className="text-headline-lg mb-6">Orders</h1>
      {isLoading ? <p>Loading…</p> : orders.length === 0 ? (
        <p className="text-on-surface-variant">No orders yet.</p>
      ) : (
        <table className="w-full text-body-sm card">
          <thead>
            <tr className="text-left text-outline border-b border-border-muted">
              <th className="p-4">Item</th><th>Seller</th><th>Amount</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const seller = o.auction?.seller;
              return (
                <tr key={o.id} className="border-b border-border-muted">
                  <td className="p-4">{o.auction?.title}</td>
                  <td>
                    {seller?.id ? <Link className="text-primary" href={`/users/${seller.id}`}>{seller.fullName}</Link> : '—'}
                  </td>
                  <td className="font-mono">${Number(o.finalAmount).toLocaleString()}</td>
                  <td>{STATUS_LABEL[o.status]}</td>
                  <td className="space-x-3 py-3 pr-3">
                    {o.status === 'AWAITING_PAYMENT' && <Link href={`/checkout/${o.id}`} className="text-primary">Pay Now</Link>}
                    {o.status === 'SHIPPED' && <button onClick={() => confirm.mutate(o.id)} className="text-primary">Confirm Receipt</button>}
                    {canReviewOrder(o, user?.role, user?.id) && (
                      <button className="text-primary" onClick={() => { setReviewError(null); setReviewOrder(o); }}>Review</button>
                    )}
                    {myReview(o, user?.id) && <span className="text-on-surface-variant">Reviewed</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <ReviewModal
        open={Boolean(reviewOrder)}
        title="Rate this seller"
        subtitle={target ? `How was your deal with ${target.fullName}?` : 'Share a rating after confirming shipment.'}
        pending={review.isPending}
        error={reviewError}
        onClose={() => setReviewOrder(null)}
        onSubmit={({ rating, comment }) => {
          if (!reviewOrder) return;
          review.mutate({ orderId: reviewOrder.id, rating, comment });
        }}
      />
    </div>
  );
}
