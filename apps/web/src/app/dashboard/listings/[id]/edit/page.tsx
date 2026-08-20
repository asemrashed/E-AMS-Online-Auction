'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { ImageUploader } from '@/components/ImageUploader';
import { useListingsQuery } from '@/hooks/useApi';
import { useMemo, useState } from 'react';

export default function EditListingPage({ params }: { params: { id: string } }) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const { data: listings = [] } = useListingsQuery(user?.role === 'SELLER');
  const listing = useMemo(() => listings.find((l) => l.id === params.id), [listings, params.id]);
  const [form, setForm] = useState<Record<string, string | boolean> | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const ready = form ?? (listing
    ? {
        title: listing.title,
        description: listing.description,
        category: listing.category,
        condition: listing.condition,
        startingBid: String(listing.startingBid),
        reservePrice: listing.reservePrice ? String(listing.reservePrice) : '',
        buyNowPrice: listing.buyNowPrice ? String(listing.buyNowPrice) : '',
        minIncrement: String(listing.minIncrement),
        antiSnipe: listing.antiSnipe,
        startsAt: listing.startsAt.slice(0, 16),
        endsAt: listing.endsAt.slice(0, 16),
      }
    : null);
  const img = form ? images : (listing?.images ?? []);

  async function save(publish: boolean) {
    if (!ready) return;
    setError(null);
    try {
      await api.patch(`/api/auctions/${params.id}`, {
        title: ready.title,
        description: ready.description,
        category: ready.category,
        condition: ready.condition,
        startingBid: Number(ready.startingBid),
        reservePrice: ready.reservePrice ? Number(ready.reservePrice) : undefined,
        buyNowPrice: ready.buyNowPrice ? Number(ready.buyNowPrice) : undefined,
        minIncrement: Number(ready.minIncrement),
        antiSnipe: ready.antiSnipe,
        startsAt: new Date(String(ready.startsAt)).toISOString(),
        endsAt: new Date(String(ready.endsAt)).toISOString(),
        images: img,
      });
      if (publish) await api.post(`/api/auctions/${params.id}/publish`);
      router.push('/dashboard/listings');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  if (!ready) return <p>Loading…</p>;

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-headline-lg">Edit listing</h1>
      <div className="card p-6 space-y-3">
        <input className="input-field" value={String(ready.title)} onChange={(e) => setForm({ ...ready, title: e.target.value })} />
        <textarea rows={5} className="input-field" value={String(ready.description)} onChange={(e) => setForm({ ...ready, description: e.target.value })} />
        <ImageUploader urls={img} onChange={(u) => { setForm(ready); setImages(u); }} label="Images (up to 4)" max={4} accept="image/*" />
      </div>
      {error && <p className="text-urgent-red">{error}</p>}
      <div className="flex gap-3">
        <button className="btn-secondary flex-1" onClick={() => save(false)}>Save</button>
        <button className="btn-primary flex-1" onClick={() => save(true)}>Publish</button>
      </div>
    </div>
  );
}