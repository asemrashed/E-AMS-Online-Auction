'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { keys } from '@/hooks/useApi';
import { useAuthStore } from '@/store/auth';

export default function AdminPayoutsPage() {
  const user = useAuthStore((s) => s.user);
  const { data: payouts = [] } = useQuery({
    queryKey: keys.payoutsAdmin,
    enabled: !!user,
    queryFn: () => api.get<Array<{ id: string; amount: string; status: string; requestedAt: string; order: { auction: { title: string } } }>>('/api/payouts'),
  });
  const qc = useQueryClient();
  const act = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'approve' | 'pay' | 'reject'; reason?: string }) =>
      api.patch(`/api/payouts/${id}/${action}`, reason ? { reason } : {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.payoutsAdmin }),
  });

  return (
    <div>
      <h1 className="text-headline-lg mb-1">Payouts</h1>
      <p className="text-body-md text-on-surface-variant mb-8">Approve first, then record payment after you send the bank transfer. This does not move money automatically.</p>
      {payouts.length === 0 ? <p>No pending payouts.</p> : (
        <div className="card divide-y divide-border-muted">
          {payouts.map((p) => (
            <div key={p.id} className="p-5 flex justify-between items-center">
              <div>
                <p className="font-semibold">{p.order.auction.title}</p>
                <p className="text-body-sm text-on-surface-variant">{p.status} · {new Date(p.requestedAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-primary">${Number(p.amount).toLocaleString()}</span>
                {p.status === 'REQUESTED' && (
                  <>
                    <button className="btn-secondary text-body-sm" onClick={() => act.mutate({ id: p.id, action: 'reject', reason: window.prompt('Reason') || 'Rejected' })}>Reject</button>
                    <button className="btn-primary text-body-sm" onClick={() => act.mutate({ id: p.id, action: 'approve' })}>Approve</button>
                  </>
                )}
                {p.status === 'APPROVED' && (
                  <button className="btn-primary text-body-sm" onClick={() => act.mutate({ id: p.id, action: 'pay' })}>Record bank transfer as paid</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}