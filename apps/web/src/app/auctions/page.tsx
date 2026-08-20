'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AuctionCard } from '@/components/AuctionCard';
import { api } from '@/lib/api';
import { useAuctionsQuery } from '@/hooks/useApi';

function AuctionsFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [q, setQ] = useState(searchParams.get('search') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? 'LIVE');
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'price-high');

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (category) p.set('category', category);
    if (q) p.set('search', q);
    if (status) p.set('status', status);
    if (sort) p.set('sort', sort);
    return p.toString();
  }, [category, q, status, sort]);

  useEffect(() => {
    if (searchParams.toString() === params) return;
    const next = params ? `${pathname}?${params}` : pathname;
    router.replace(next, { scroll: false });
  }, [params, pathname, router, searchParams]);

  const { data: auctions = [], isFetching } = useAuctionsQuery(params);
  const { data: categories = [] } = useQuery({
    queryKey: ['auction-categories'],
    queryFn: () => api.get<string[]>('/api/auctions/meta/categories', false),
  });

  return (
    <main className="max-w-container-max mx-auto px-margin-desktop py-10">
      <h1 className="text-headline-lg mb-1">Active Listings</h1>
      <p className="text-body-md text-on-surface-variant mb-6">
        {auctions.length} lots found{isFetching ? ' · updating' : ''}
      </p>

      <div className="card p-4 mb-8 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-3">
          <label className="text-label-caps text-outline">Category</label>
          <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-5">
          <label className="text-label-caps text-outline">Search</label>
          <input
            className="input-field"
            placeholder="Search lots…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-label-caps text-outline">Time</label>
          <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="LIVE">Live</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="ENDED">Ended</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-label-caps text-outline">Price</label>
          <select className="input-field" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="price-high">Max → min</option>
            <option value="price-low">Min → max</option>
          </select>
        </div>
      </div>

      {auctions.length === 0 ? (
        <p className="text-on-surface-variant">No auctions match these filters.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.map((a) => (
            <AuctionCard key={a.id} auction={a} />
          ))}
        </div>
      )}
    </main>
  );
}

export default function AuctionsPage() {
  return (
    <Suspense fallback={<main className="max-w-container-max mx-auto px-margin-desktop py-10">Loading listings…</main>}>
      <AuctionsFilters />
    </Suspense>
  );
}
