'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { useMyBidsQuery, useOrdersQuery, useWatchlistQuery } from '@/hooks/useApi';

export default function DashboardHome() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const isBuyer = user?.role === 'BUYER';
  const isSeller = user?.role === 'SELLER';
  const orders = useOrdersQuery(!!user && isBuyer);
  const bids = useMyBidsQuery(!!user && isBuyer);
  const watch = useWatchlistQuery(!!user && isBuyer);

  if (loading) return null;
  if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
    return <p>Redirecting… <Link href="/admin" className="text-primary">Open admin</Link></p>;
  }

  if (isSeller) {
    return (
      <div>
        <h1 className="text-headline-lg mb-1">Seller overview</h1>
        <p className="text-body-md text-on-surface-variant mb-8">Welcome back, {user.fullName}.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/dashboard/listings" className="card p-5 hover:border-primary">Listings</Link>
          <Link href="/dashboard/sales" className="card p-5 hover:border-primary">Sales & shipping</Link>
          <Link href="/dashboard/payouts" className="card p-5 hover:border-primary">Payouts</Link>
        </div>
      </div>
    );
  }

  const list = orders.data ?? [];
  return (
    <div>
      <h1 className="text-headline-lg mb-1">Buyer overview</h1>
      <p className="text-body-md text-on-surface-variant mb-8">Welcome back, {user?.fullName}.</p>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-5"><p className="text-label-caps text-outline">Orders</p><p className="text-headline-md font-mono">{list.length}</p></div>
        <div className="card p-5"><p className="text-label-caps text-outline">Active bids</p><p className="text-headline-md font-mono">{bids.data?.length ?? 0}</p></div>
        <div className="card p-5"><p className="text-label-caps text-outline">Watchlist</p><p className="text-headline-md font-mono">{watch.data?.length ?? 0}</p></div>
      </div>
      <div className="flex gap-3">
        <Link href="/dashboard/orders" className="btn-primary">Orders</Link>
        <Link href="/dashboard/bids" className="btn-secondary">My bids</Link>
        <Link href="/auctions" className="btn-secondary">Browse lots</Link>
      </div>
    </div>
  );
}