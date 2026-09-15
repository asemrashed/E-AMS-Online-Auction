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
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/auctions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.listings }),
    onError: (e) => alert(e instanceof Error ? e.message : 'Delete failed'),
  });

  if (user && user.role !== 'SELLER') return <p>Seller accounts only.</p>;

  function canEdit(l: { status: string }) {
    return l.status === 'DRAFT' || l.status === 'LIVE' || l.status === 'FLAGGED';
  }
  function canDelete(l: { status: string; _count?: { bids?: number } }) {
    if (l.status === 'ENDED') return false;
    return (l._count?.bids ?? 0) === 0;
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
              <div className="flex gap-4 min-w-0">
                <div className="w-16 h-20 shrink-0 rounded bg-surface-container-high overflow-hidden flex items-center justify-center">
                  {l.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.images[0]} alt="" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <span className="text-outline text-[10px]">No img</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{l.title}</p>
                  <p className="text-body-sm text-on-surface-variant">
                    {l.status} · {l._count?.bids ?? 0} bids · ${Number(l.currentBid).toLocaleString()}
                  </p>
                  <p className="text-body-sm text-on-surface-variant">Ends {new Date(l.endsAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end items-start">
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
                {canDelete(l) && (
                  <button
                    type="button"
                    className="btn-secondary text-body-sm text-urgent-red"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (confirm('Delete this listing? This cannot be undone.')) {
                        remove.mutate(l.id);
                      }
                    }}
                  >
                    Delete
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
