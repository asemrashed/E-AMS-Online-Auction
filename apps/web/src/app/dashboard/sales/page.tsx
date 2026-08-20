'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { keys, useSalesQuery } from '@/hooks/useApi';
import { useAuthStore } from '@/store/auth';
import type { Order } from '@/lib/schemas';
import { ReviewModal } from '@/components/ReviewModal';
import { canReviewOrder, counterpart, myReview } from '@/lib/reviews';

export default function SellerSalesPage() {
  const user = useAuthStore((s) => s.user);
  const { data: sales = [], isLoading } = useSalesQuery(user?.role === 'SELLER');
  const qc = useQueryClient();
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const ship = useMutation({
    mutationFn: (id: string) => api.patch(`/api/orders/${id}/ship`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.sales }),
  });
  const confirmPayment = useMutation({
    mutationFn: (id: string) => api.patch<Order>(`/api/orders/${id}/confirm-payment`),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: keys.sales });
      if (order.promptReview) setReviewOrder(order);
    },
  });
  const claim = useMutation({
    mutationFn: (id: string) => api.post(`/api/payouts/orders/${id}/claim`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.sales }); qc.invalidateQueries({ queryKey: keys.payoutsMine }); },
  });
  const review = useMutation({
    mutationFn: (payload: { orderId: string; rating: number; comment: string }) =>
      api.post(`/api/reviews/orders/${payload.orderId}`, { rating: payload.rating, comment: payload.comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.sales });
      setReviewOrder(null);
      setReviewError(null);
    },
    onError: (e: Error) => setReviewError(e.message),
  });

  const target = reviewOrder ? counterpart(reviewOrder, 'SELLER') : null;

  return (
    <div>
      <h1 className="text-headline-lg mb-1">Sales</h1>
      <p className="text-body-md text-on-surface-variant mb-8">Confirm payment, ship sold items, then claim payout after the buyer confirms receipt.</p>
      {isLoading ? <p>Loading…</p> : sales.length === 0 ? <p>No sales yet.</p> : (
        <div className="card divide-y divide-border-muted">
          {sales.map((o) => (
            <div key={o.id} className="p-5 flex justify-between items-center gap-4">
              <div>
                <p className="font-semibold">{o.auction?.title}</p>
                <p className="text-body-sm text-on-surface-variant">
                  ${Number(o.finalAmount).toLocaleString()} · you receive ${Number(o.sellerPayoutAmt).toLocaleString()} · {o.status.replace(/_/g, ' ')}
                </p>
                {o.buyer?.id && (
                  <Link className="text-body-sm text-primary" href={`/users/${o.buyer.id}`}>Buyer: {o.buyer.fullName}</Link>
                )}
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                {o.status === 'PAID_ESCROW' && canReviewOrder(o, user?.role, user?.id) && (
                  <button className="btn-secondary text-body-sm" onClick={() => confirmPayment.mutate(o.id)}>Confirm payment</button>
                )}
                {o.status === 'PAID_ESCROW' && <button className="btn-primary text-body-sm" onClick={() => ship.mutate(o.id)}>Mark shipped</button>}
                {o.status === 'RECEIVED_CONFIRMED' && <button className="btn-primary text-body-sm" onClick={() => claim.mutate(o.id)}>Claim payout</button>}
                {o.status === 'PAYOUT_REQUESTED' && <span className="text-body-sm text-tertiary">Pending admin approval</span>}
                {o.status === 'PAYOUT_COMPLETED' && <span className="text-body-sm text-success-green">Paid out (recorded)</span>}
                {canReviewOrder(o, user?.role, user?.id) && (
                  <button className="btn-secondary text-body-sm" onClick={() => { setReviewError(null); setReviewOrder(o); }}>Review</button>
                )}
                {myReview(o, user?.id) && <span className="text-body-sm text-on-surface-variant">Reviewed</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      <ReviewModal
        open={Boolean(reviewOrder)}
        title="Rate this buyer"
        subtitle={target ? `How was your deal with ${target.fullName}?` : 'Share a rating after confirming payment.'}
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
