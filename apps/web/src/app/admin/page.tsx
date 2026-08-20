'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { keys } from '@/hooks/useApi';
import { useAuthStore } from '@/store/auth';

export default function AdminHomePage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const analytics = useQuery({
    queryKey: keys.adminAnalytics,
    enabled: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
    queryFn: () => api.get<{ activeUsers: number; flaggedAuctions: number; platformRevenue: number; liveAuctions: number }>('/api/admin/analytics'),
  });
  const flags = useQuery({
    queryKey: keys.adminFlags,
    enabled: !!user,
    queryFn: () => api.get<Array<{ id: string; reason: string; createdAt: string; auction: { title: string; seller: { fullName: string } } }>>('/api/admin/flags'),
  });
  const resolve = useMutation({
    mutationFn: ({ id, pull }: { id: string; pull: boolean }) => api.patch(`/api/admin/flags/${id}`, { pullAuction: pull }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.adminFlags }),
  });

  const a = analytics.data;
  return (
    <div>
      <div className="flex justify-between mb-8">
        <div>
          <h1 className="text-headline-lg mb-1">Admin dashboard</h1>
          <p className="text-on-surface-variant">Moderation, users, payouts.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/users" className="btn-secondary">Users</Link>
          <Link href="/admin/payouts" className="btn-secondary">Payouts</Link>
          {user?.role === 'SUPER_ADMIN' && <Link href="/admin/commission-report" className="btn-primary">Commission</Link>}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-5"><p className="text-label-caps text-outline">Commission (escrow+)</p><p className="font-mono text-headline-md">${Number(a?.platformRevenue ?? 0).toLocaleString()}</p></div>
        <div className="card p-5"><p className="text-label-caps text-outline">Active users</p><p className="font-mono text-headline-md">{a?.activeUsers ?? '—'}</p></div>
        <div className="card p-5"><p className="text-label-caps text-outline">Open flags</p><p className="font-mono text-headline-md text-urgent-red">{a?.flaggedAuctions ?? '—'}</p></div>
        <div className="card p-5"><p className="text-label-caps text-outline">Live lots</p><p className="font-mono text-headline-md">{a?.liveAuctions ?? '—'}</p></div>
      </div>
      <div className="card p-6">
        <h2 className="text-headline-md mb-4">Moderation queue</h2>
        {!flags.data?.length ? <p className="text-on-surface-variant">No open reports.</p> : flags.data.map((f) => (
          <div key={f.id} className="py-3 border-b border-border-muted flex justify-between gap-4">
            <div>
              <p className="font-medium">{f.auction.title}</p>
              <p className="text-body-sm text-on-surface-variant">{f.reason} · {f.auction.seller.fullName}</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary text-body-sm" onClick={() => resolve.mutate({ id: f.id, pull: false })}>Dismiss</button>
              <button className="btn-primary text-body-sm" onClick={() => resolve.mutate({ id: f.id, pull: true })}>Pull listing</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}