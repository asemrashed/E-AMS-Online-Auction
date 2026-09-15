'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import { ImageUploader } from '@/components/ImageUploader';
import { PublishConfirmModal, type ListingOverview } from '@/components/PublishConfirmModal';
import { useAuthStore } from '@/store/auth';

type ListingForm = {
  title: string;
  description: string;
  category: string;
  condition: string;
  startingBid: string;
  minIncrement: string;
  reservePrice: string;
  buyNowPrice: string;
  antiSnipe: boolean;
  startsAt: string;
  endsAt: string;
};

function toOverview(values: ListingForm, images: string[]): ListingOverview {
  return {
    ...values,
    images,
    startingBid: values.startingBid,
    minIncrement: values.minIncrement,
    reservePrice: values.reservePrice,
    buyNowPrice: values.buyNowPrice,
  };
}

function payloadFrom(values: ListingForm, images: string[]) {
  return {
    ...values,
    startingBid: Number(values.startingBid),
    reservePrice: values.reservePrice ? Number(values.reservePrice) : undefined,
    buyNowPrice: values.buyNowPrice ? Number(values.buyNowPrice) : undefined,
    minIncrement: Number(values.minIncrement),
    startsAt: new Date(values.startsAt).toISOString(),
    endsAt: new Date(values.endsAt).toISOString(),
    images,
  };
}

export default function NewListingPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const form = useForm<ListingForm>({
    defaultValues: {
      title: '', description: '', category: 'Heavy Machinery', condition: 'Used - Good',
      startingBid: '1000', minIncrement: '100', reservePrice: '', buyNowPrice: '', antiSnipe: true,
      startsAt: new Date().toISOString().slice(0, 16),
      endsAt: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 16),
    },
  });

  function validate(): string | null {
    const values = form.getValues();
    if (values.title.trim().length < 5) return 'Title must be at least 5 characters.';
    if (values.description.trim().length < 20) return 'Description must be at least 20 characters.';
    if (!Number(values.startingBid) || Number(values.startingBid) <= 0) return 'Starting bid must be greater than 0.';
    if (!Number(values.minIncrement) || Number(values.minIncrement) <= 0) return 'Min increment must be greater than 0.';
    const starts = new Date(values.startsAt);
    const ends = new Date(values.endsAt);
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) return 'Start and end times are required.';
    if (ends <= starts) return 'End time must be after the start time.';
    return null;
  }

  async function submit(publish: boolean) {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setPending(true);
    const values = form.getValues();
    try {
      const auction = createdId
        ? { id: createdId }
        : await api.post<{ id: string }>('/api/auctions', payloadFrom(values, images));
      if (!createdId) setCreatedId(auction.id);
      if (publish) {
        await api.patch(`/api/auctions/${auction.id}`, payloadFrom(values, images));
        await api.post(`/api/auctions/${auction.id}/publish`);
      } else if (createdId) {
        await api.patch(`/api/auctions/${auction.id}`, payloadFrom(values, images));
      }
      router.push('/dashboard/listings');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
      setPending(false);
    }
  }

  if (user && user.role !== 'SELLER') return <p>Seller accounts only.</p>;

  const overview = toOverview(form.watch(), images);

  return (
    <div className="max-w-3xl">
      <h1 className="text-headline-lg mb-6">Create Auction</h1>
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <div className="card p-6 space-y-4">
          <label className="text-label-caps text-outline">Title</label>
          <input className="input-field" {...form.register('title')} />
          <div className="grid grid-cols-2 gap-4">
            <select className="input-field" {...form.register('category')}>
              <option>Heavy Machinery</option><option>Industrial Equipment</option><option>Vehicles</option><option>Electronics</option><option>Office Equipment</option><option>Real Estate & Land</option>
            </select>
            <select className="input-field" {...form.register('condition')}>
              <option>New</option><option>Used - Excellent</option><option>Used - Good</option><option>Used - Fair</option>
            </select>
          </div>
          <textarea rows={5} className="input-field" {...form.register('description')} />
          <ImageUploader urls={images} onChange={setImages} label="Listing images (up to 4)" max={4} accept="image/*" />
        </div>
        <div className="card p-6 grid grid-cols-2 gap-4">
          <div><label className="text-label-caps text-outline">Starting bid (USD)</label><input type="number" className="input-field font-mono" {...form.register('startingBid')} /></div>
          <div><label className="text-label-caps text-outline">Min increment</label><input type="number" className="input-field font-mono" {...form.register('minIncrement')} /></div>
          <div><label className="text-label-caps text-outline">Reserve (optional)</label><input type="number" className="input-field font-mono" {...form.register('reservePrice')} /></div>
          <div><label className="text-label-caps text-outline">Buy Now (optional)</label><input type="number" className="input-field font-mono" {...form.register('buyNowPrice')} /></div>
          <div><label className="text-label-caps text-outline">Starts</label><input type="datetime-local" className="input-field" {...form.register('startsAt')} /></div>
          <div><label className="text-label-caps text-outline">Ends</label><input type="datetime-local" className="input-field" {...form.register('endsAt')} /></div>
          <label className="col-span-2 flex items-center gap-2 text-body-sm"><input type="checkbox" {...form.register('antiSnipe')} /> Anti-snipe (final 5 min extends 5 min)</label>
        </div>
        {error && !confirmOpen && <p className="text-urgent-red text-body-sm">{error}</p>}
        <div className="flex gap-3">
          <button type="button" className="btn-secondary flex-1" disabled={pending} onClick={() => submit(false)}>Save draft</button>
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
        </div>
      </form>
      <PublishConfirmModal
        open={confirmOpen}
        pending={pending}
        error={error}
        listing={overview}
        onClose={() => { if (!pending) { setConfirmOpen(false); setError(null); } }}
        onConfirm={() => submit(true)}
      />
    </div>
  );
}
