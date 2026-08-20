'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { keys, useListingsQuery } from '@/hooks/useApi';
import { useAuthStore } from '@/store/auth';

export default function SellerListingsPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { data: listings = [], isLoading } = useListingsQuery(user?.role === 'SELLER');
  const endEarly = useMutation({
    mutationFn: (id: string) => api.post(`/api/auctions/${id}/end-early`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.listings }),
  });

  if (user && user.role !== 'SELLER') return <p>Seller accounts only.</p>;

  function canEdit(l: { status: string; startsAt: string }) {
    if (l.status === 'DRAFT') return true;
    return l.status === 'LIVE' && new Date(l.startsAt) > new Date();
  }
  function canClose(l: { status: string; startsAt: string; _count?: { bids?: number } }) {
    return l.status === 'LIVE' && new Date(l.startsAt) <= new Date() && (l._count?.bids ?? 0) > 0;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-headline-lg mb-1">My Listings</h1>
          <p className="text-body-md text-on-surface-variant">Draft, live, and ended auctions.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/sales" className="btn-secondary">Sales</Link>
          <Link href="/dashboard/payouts" className="btn-secondary">Payouts</Link>
          <Link href="/dashboard/listings/new" className="btn-primary">+ New Listing</Link>
        </div>
      </div>
      {isLoading ? <p>Loading…</p> : listings.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="mb-4">No listings yet.</p>
          <Link href="/dashboard/listings/new" className="btn-primary">Create listing</Link>
        </div>
      ) : (
        <div className="card divide-y divide-border-muted">
          {listings.map((l) => (
            <div key={l.id} className="p-5 flex justify-between gap-4">
              <div>
                <p className="font-semibold">{l.title}</p>
                <p className="text-body-sm text-on-surface-variant">{l.status} · {l._count?.bids ?? 0} bids · ${Number(l.currentBid).toLocaleString()}</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                {canEdit(l) && <Link href={`/dashboard/listings/${l.id}/edit`} className="btn-secondary text-body-sm">Edit</Link>}
                {canClose(l) && (
                  <button
                    type="button"
                    className="btn-secondary text-body-sm"
                    disabled={endEarly.isPending}
                    onClick={() => {
                      if (confirm('Close this auction now and award it to the highest bidder?')) {
                        endEarly.mutate(l.id);
                      }
                    }}
                  >
                    Close & award high bidder
                  </button>
                )}
                <Link href={`/auctions/${l.slug}`} className="btn-secondary text-body-sm">View</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
