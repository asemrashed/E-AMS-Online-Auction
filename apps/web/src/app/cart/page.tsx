'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { keys, useCartQuery } from '@/hooks/useApi';
import { useAuthStore } from '@/store/auth';
import { useStartCheckout } from '@/components/AddToCartButton';

export default function CartPage() {
  const { user, loading } = useAuthStore();
  const { data, isLoading } = useCartQuery(user?.role === 'BUYER');
  const qc = useQueryClient();
  const checkout = useStartCheckout();
  const remove = useMutation({
    mutationFn: (auctionId: string) => api.delete(`/api/cart/${auctionId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.cart }),
  });

  if (loading || isLoading) return <main className="max-w-container-max mx-auto px-margin-desktop py-10">Loading...</main>;
  if (user && user.role !== 'BUYER') return <main className="max-w-container-max mx-auto px-margin-desktop py-10">Cart is only for buyers.</main>;
  if (!user) {
    return (
      <main className="max-w-container-max mx-auto px-margin-desktop py-10">
        <h1 className="text-headline-lg mb-4">Your Cart</h1>
        <p><Link href="/login" className="text-primary">Log in</Link> to view your cart.</p>
      </main>
    );
  }

  const items = data?.items ?? [];
  return (
    <main className="max-w-container-max mx-auto px-margin-desktop py-10">
      <h1 className="text-headline-lg mb-6">Your Cart</h1>
      {items.length === 0 ? (
        <p>Empty. <Link href="/auctions" className="text-primary">Browse auctions</Link></p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const won = item.auction.status === 'ENDED' && item.auction.winnerId === user.id;
            return (
              <div key={item.id} className="card p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <Link href={`/auctions/${item.auction.slug}`} className="font-semibold">{item.auction.title}</Link>
                  <p className="font-mono text-primary">${Number(item.auction.currentBid).toLocaleString()}</p>
                  <p className="text-body-sm text-on-surface-variant">
                    {item.auction.status === 'LIVE' && 'Live — checkout unlocks if you win.'}
                    {won && 'You won this lot. Pay to complete purchase.'}
                    {item.auction.status === 'ENDED' && !won && 'Auction ended. You did not win this lot.'}
                  </p>
                  {checkout.isError && checkout.variables === item.auction.id && (
                    <p className="text-body-sm text-urgent-red mt-1">{(checkout.error as Error).message}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary text-body-sm" onClick={() => remove.mutate(item.auction.id)}>Remove</button>
                  {won && (
                    <button
                      className="btn-primary text-body-sm"
                      disabled={checkout.isPending}
                      onClick={() => checkout.mutate(item.auction.id)}
                    >
                      Checkout
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
