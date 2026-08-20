'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { keys } from '@/hooks/useApi';
import { useAuthStore } from '@/store/auth';

export default function SellerPayoutsPage() {
  const user = useAuthStore((s) => s.user);
  const { data: payouts = [] } = useQuery({
    queryKey: keys.payoutsMine,
    enabled: user?.role === 'SELLER',
    queryFn: () => api.get<Array<{ id: string; amount: string; status: string; requestedAt: string; order: { auction: { title: string } } }>>('/api/payouts/mine'),
  });
  return (
    <div>
      <h1 className="text-headline-lg mb-2">Payout requests</h1>
      <p className="text-body-sm text-on-surface-variant mb-8">Approved requests are paid via manual bank transfer, then marked paid by an admin.</p>
      {payouts.length === 0 ? <p>No payout requests yet.</p> : (
        <div className="card divide-y divide-border-muted">
          {payouts.map((p) => (
            <div key={p.id} className="p-5 flex justify-between">
              <div>
                <p className="font-semibold">{p.order.auction.title}</p>
                <p className="text-body-sm text-on-surface-variant">{new Date(p.requestedAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-primary">${Number(p.amount).toLocaleString()}</p>
                <p className="text-body-sm">{p.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}