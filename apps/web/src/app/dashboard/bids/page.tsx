'use client';

import Link from 'next/link';
import { useMyBidsQuery } from '@/hooks/useApi';
import { useAuthStore } from '@/store/auth';
import { useStartCheckout } from '@/components/AddToCartButton';

export default function MyBidsPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useMyBidsQuery(user?.role === 'BUYER');
  const checkout = useStartCheckout();
  if (user && user.role !== 'BUYER') return <p>Buyer accounts only.</p>;
  return (
    <div>
      <h1 className="text-headline-lg mb-6">My Bids</h1>
      {isLoading ? <p>Loading…</p> : !data?.length ? (
        <p className="text-on-surface-variant">No bids yet. <Link href="/auctions" className="text-primary">Browse auctions</Link></p>
      ) : (
        <div className="card divide-y divide-border-muted">
          {data.map((b) => (
            <div key={b.id} className="p-5 flex justify-between gap-4 items-center">
              <div>
                <Link href={`/auctions/${b.auction?.slug}`} className="font-semibold hover:text-primary">{b.auction?.title}</Link>
                <p className="text-body-sm text-on-surface-variant">{b.auction?.status} · Your bid ${Number(b.amount).toLocaleString()}</p>
                {checkout.isError && checkout.variables === b.auction?.id && (
                  <p className="text-body-sm text-urgent-red mt-1">{(checkout.error as Error).message}</p>
                )}
              </div>
              {b.auction?.winnerId === user?.id && b.auction?.status === 'ENDED' && (
                <button
                  type="button"
                  className="btn-primary text-body-sm"
                  disabled={checkout.isPending}
                  onClick={() => checkout.mutate(b.auction!.id)}
                >
                  {checkout.isPending && checkout.variables === b.auction.id ? 'Opening…' : 'Checkout'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
