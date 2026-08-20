'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { keys, useWatchlistQuery } from '@/hooks/useApi';
import { useAuthStore } from '@/store/auth';

export default function WatchlistPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useWatchlistQuery(user?.role === 'BUYER');
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/watchlist/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.watchlist }),
  });
  if (user && user.role !== 'BUYER') return <p>Buyer accounts only.</p>;
  return (
    <div>
      <h1 className="text-headline-lg mb-6">Watchlist</h1>
      {isLoading ? <p>Loading…</p> : !data?.length ? (
        <p className="text-on-surface-variant">Nothing watched. <Link href="/auctions" className="text-primary">Find lots</Link></p>
      ) : (
        <div className="card divide-y divide-border-muted">
          {data.map((item) => (
            <div key={item.id} className="p-5 flex justify-between items-center">
              <Link href={`/auctions/${item.auction.slug}`} className="font-semibold hover:text-primary">{item.auction.title}</Link>
              <button className="btn-secondary text-body-sm" onClick={() => remove.mutate(item.auction.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}