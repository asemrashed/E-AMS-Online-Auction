'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useOrderQuery } from '@/hooks/useApi';

export default function CheckoutPage({ params, searchParams }: { params: { orderId: string }; searchParams: { status?: string } }) {
  const { data: order } = useOrderQuery(params.orderId);
  const [gateway, setGateway] = useState<'stripe' | 'sslcommerz'>('stripe');
  const pay = useMutation({
    mutationFn: () => api.post<{ redirectUrl: string }>(`/api/payments/checkout/${gateway}`, { orderId: params.orderId }),
    onSuccess: (s) => { window.location.href = s.redirectUrl; },
  });

  if (!order) return <main className="max-w-3xl mx-auto px-margin-desktop py-10">Loading...</main>;

  return (
    <main className="max-w-3xl mx-auto px-margin-desktop py-10">
      <h1 className="text-headline-lg mb-1">Secure Checkout</h1>
      <p className="text-body-sm text-on-surface-variant mb-8">Funds are held in escrow until you confirm receipt.</p>
      {searchParams.status === 'failed' && <p className="text-urgent-red mb-4">Payment failed. Try again.</p>}
      {searchParams.status === 'cancelled' && <p className="text-on-surface-variant mb-4">Payment cancelled.</p>}

      <div className="card p-6 mb-6">
        <h2 className="text-headline-md mb-4">{order.auction?.title}</h2>
        <div className="flex justify-between">
          <span>Amount</span>
          <span className="font-mono">${Number(order.finalAmount).toLocaleString()}</span>
        </div>
      </div>

      <div className="card p-6 mb-6 space-y-3">
        <h2 className="text-headline-md mb-2">Payment method</h2>
        <label className="flex gap-3 border border-border-muted rounded p-4">
          <input type="radio" checked={gateway === 'stripe'} onChange={() => setGateway('stripe')} />
          <div>
            <p className="font-medium">Card (Stripe) — USD</p>
            <p className="text-body-sm text-on-surface-variant">Charged in US dollars.</p>
          </div>
        </label>
        <label className="flex gap-3 border border-border-muted rounded p-4">
          <input type="radio" checked={gateway === 'sslcommerz'} onChange={() => setGateway('sslcommerz')} />
          <div>
            <p className="font-medium">SSLCommerz — BDT</p>
            <p className="text-body-sm text-on-surface-variant">Local banks / mobile banking. Amount is sent as BDT, not converted from USD automatically.</p>
          </div>
        </label>
      </div>
      {pay.isError && <p className="text-urgent-red text-body-sm mb-4">{(pay.error as Error).message}</p>}
      <button className="btn-primary w-full" disabled={pay.isPending} onClick={() => pay.mutate()}>
        {pay.isPending ? 'Redirecting…' : 'Complete secure transaction'}
      </button>
    </main>
  );
}