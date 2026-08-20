'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { keys } from '@/hooks/useApi';
import { useAuthStore } from '@/store/auth';

export default function CommissionReportPage() {
  const user = useAuthStore((s) => s.user);
  const { data } = useQuery({
    queryKey: keys.commission,
    enabled: user?.role === 'SUPER_ADMIN',
    queryFn: () => api.get<{ orders: Array<{ id: string; finalAmount: string; platformFeeAmt: string; status: string; createdAt: string; auction: { title: string } }>; totals: { totalRevenue: number; totalCommission: number; orderCount: number } }>('/api/super-admin/commission-report'),
  });

  if (user && user.role !== 'SUPER_ADMIN') return <p>Super Admin only.</p>;

  return (
    <div>
      <h1 className="text-headline-lg mb-2">Commission report</h1>
      <p className="text-on-surface-variant mb-6">Paid and in-escrow orders only.</p>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-5"><p className="text-label-caps text-outline">GMV</p><p className="font-mono text-headline-md">${Number(data?.totals.totalRevenue ?? 0).toLocaleString()}</p></div>
        <div className="card p-5"><p className="text-label-caps text-outline">Commission</p><p className="font-mono text-headline-md">${Number(data?.totals.totalCommission ?? 0).toLocaleString()}</p></div>
        <div className="card p-5"><p className="text-label-caps text-outline">Orders</p><p className="font-mono text-headline-md">{data?.totals.orderCount ?? 0}</p></div>
      </div>
      <div className="card divide-y divide-border-muted">
        {data?.orders.map((o) => (
          <div key={o.id} className="p-4 flex justify-between text-body-sm">
            <span>{o.auction.title}</span>
            <span className="font-mono">fee ${Number(o.platformFeeAmt).toLocaleString()} · {o.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}