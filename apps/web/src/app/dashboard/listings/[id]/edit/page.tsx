'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { ImageUploader } from '@/components/ImageUploader';
import { PublishConfirmModal, type ListingOverview } from '@/components/PublishConfirmModal';
import { useListingsQuery } from '@/hooks/useApi';
import { useEffect, useMemo, useState } from 'react';

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type ListingForm = {
  title: string;
  description: string;
  category: string;
  condition: string;
  startingBid: string;
  reservePrice: string;
  buyNowPrice: string;
  minIncrement: string;
  antiSnipe: boolean;
  startsAt: string;
  endsAt: string;
};

export default function EditListingPage({ params }: { params: { id: string } }) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const { data: listings = [], isLoading } = useListingsQuery(user?.role === 'SELLER');
  const listing = useMemo(() => listings.find((l) => l.id === params.id), [listings, params.id]);
  const [form, setForm] = useState<ListingForm | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!listing || form) return;
    setForm({
      title: listing.title,
      description: listing.description,
      category: listing.category,
      condition: listing.condition,
      startingBid: String(listing.startingBid),
      reservePrice: listing.reservePrice ? String(listing.reservePrice) : '',
      buyNowPrice: listing.buyNowPrice ? String(listing.buyNowPrice) : '',
      minIncrement: String(listing.minIncrement),
      antiSnipe: listing.antiSnipe,
      startsAt: toDatetimeLocal(listing.startsAt),
      endsAt: toDatetimeLocal(listing.endsAt),
    });
    setImages(listing.images ?? []);
  }, [listing, form]);

  const bidCount = listing?._count?.bids ?? 0;
  const canPublish = listing?.status === 'DRAFT';
  const priceLocked = bidCount > 0;

  function patch<K extends keyof ListingForm>(key: K, value: ListingForm[K]) {
    if (!form) return;
    setForm({ ...form, [key]: value });
  }

  function validate(): string | null {
    if (!form) return 'Listing is still loading.';
    if (form.title.trim().length < 5) return 'Title must be at least 5 characters.';
    if (form.description.trim().length < 20) return 'Description must be at least 20 characters.';
    if (!Number(form.startingBid) || Number(form.startingBid) <= 0) return 'Starting bid must be greater than 0.';
    if (!Number(form.minIncrement) || Number(form.minIncrement) <= 0) return 'Min increment must be greater than 0.';
    const starts = new Date(form.startsAt);
    const ends = new Date(form.endsAt);
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) return 'Start and end times are required.';
    if (ends <= starts) return 'End time must be after the start time.';
    return null;
  }

  function overview(): ListingOverview | null {
    if (!form) return null;
    return { ...form, images };
  }

  async function save(publish: boolean) {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    if (!form) return;
    setError(null);
    setPending(true);
    try {
      await api.patch(`/api/auctions/${params.id}`, {
        title: form.title,
        description: form.description,
        category: form.category,
        condition: form.condition,
        startingBid: Number(form.startingBid),
        reservePrice: form.reservePrice ? Number(form.reservePrice) : undefined,
        buyNowPrice: form.buyNowPrice ? Number(form.buyNowPrice) : undefined,
        minIncrement: Number(form.minIncrement),
        antiSnipe: form.antiSnipe,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        images,
      });
      if (publish) await api.post(`/api/auctions/${params.id}/publish`);
      router.push('/dashboard/listings');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
      setPending(false);
    }
  }

  async function remove() {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    setError(null);
    setDeleting(true);
    try {
      await api.delete(`/api/auctions/${params.id}`);
      router.push('/dashboard/listings');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
      setDeleting(false);
    }
  }

  if (user && user.role !== 'SELLER') return <p>Seller accounts only.</p>;
  if (!user || isLoading) return <p>Loading…</p>;
  if (!listing) return <p>Listing not found.</p>;
  if (!form) return <p>Loading…</p>;

  const snapshot = overview()!;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-headline-lg">Edit listing</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            {listing.status} · {bidCount} bids · you can change images, prices, and end time
          </p>
        </div>
        <button type="button" className="btn-secondary text-urgent-red" disabled={deleting || pending} onClick={remove}>
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>

      <div className="card p-6 space-y-4">
        <label className="text-label-caps text-outline">Title</label>
        <input className="input-field" value={form.title} onChange={(e) => patch('title', e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <select className="input-field" value={form.category} onChange={(e) => patch('category', e.target.value)}>
            <option>Heavy Machinery</option><option>Industrial Equipment</option><option>Vehicles</option><option>Electronics</option><option>Office Equipment</option><option>Real Estate & Land</option>
          </select>
          <select className="input-field" value={form.condition} onChange={(e) => patch('condition', e.target.value)}>
            <option>New</option><option>Used - Excellent</option><option>Used - Good</option><option>Used - Fair</option>
          </select>
        </div>
        <textarea rows={5} className="input-field" value={form.description} onChange={(e) => patch('description', e.target.value)} />
        <ImageUploader urls={images} onChange={setImages} label="Images (up to 4) — click a thumbnail to remove" max={4} accept="image/*" />
      </div>

      <div className="card p-6 grid grid-cols-2 gap-4">
        <div>
          <label className="text-label-caps text-outline">Starting bid (USD)</label>
          <input type="number" className="input-field font-mono" value={form.startingBid} disabled={priceLocked} onChange={(e) => patch('startingBid', e.target.value)} />
          {priceLocked && <p className="text-body-sm text-on-surface-variant mt-1">Locked after the first bid.</p>}
        </div>
        <div>
          <label className="text-label-caps text-outline">Min increment</label>
          <input type="number" className="input-field font-mono" value={form.minIncrement} onChange={(e) => patch('minIncrement', e.target.value)} />
        </div>
        <div>
          <label className="text-label-caps text-outline">Reserve (optional)</label>
          <input type="number" className="input-field font-mono" value={form.reservePrice} onChange={(e) => patch('reservePrice', e.target.value)} />
        </div>
        <div>
          <label className="text-label-caps text-outline">Buy Now (optional)</label>
          <input type="number" className="input-field font-mono" value={form.buyNowPrice} onChange={(e) => patch('buyNowPrice', e.target.value)} />
        </div>
        <div>
          <label className="text-label-caps text-outline">Starts</label>
          <input type="datetime-local" className="input-field" value={form.startsAt} disabled={listing.status === 'LIVE' && new Date(listing.startsAt) <= new Date()} onChange={(e) => patch('startsAt', e.target.value)} />
        </div>
        <div>
          <label className="text-label-caps text-outline">Ends</label>
          <input type="datetime-local" className="input-field" value={form.endsAt} onChange={(e) => patch('endsAt', e.target.value)} />
        </div>
        <label className="col-span-2 flex items-center gap-2 text-body-sm">
          <input type="checkbox" checked={form.antiSnipe} onChange={(e) => patch('antiSnipe', e.target.checked)} />
          Anti-snipe (final 5 min extends 5 min)
        </label>
      </div>

      {error && !confirmOpen && <p className="text-urgent-red">{error}</p>}
      <div className="flex gap-3">
        <button type="button" className="btn-secondary flex-1" disabled={pending} onClick={() => save(false)}>Save changes</button>
        {canPublish && (
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={pending}
            onClick={() => {
              const problem = validate();
              if (problem) {
                setError(problem);
                return;
              }
              setError(null);
              setConfirmOpen(true);
            }}
          >
            Publish
          </button>
        )}
      </div>

      <PublishConfirmModal
        open={confirmOpen}
        pending={pending}
        error={error}
        listing={snapshot}
        onClose={() => { if (!pending) { setConfirmOpen(false); setError(null); } }}
        onConfirm={() => save(true)}
      />
    </div>
  );
}
