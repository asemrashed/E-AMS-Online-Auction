'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import { ImageUploader } from '@/components/ImageUploader';
import { useAuthStore } from '@/store/auth';

export default function NewListingPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: {
      title: '', description: '', category: 'Heavy Machinery', condition: 'Used - Good',
      startingBid: '1000', minIncrement: '100', reservePrice: '', buyNowPrice: '', antiSnipe: true,
      startsAt: new Date().toISOString().slice(0, 16),
      endsAt: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 16),
    },
  });

  async function submit(publish: boolean) {
    setError(null);
    const values = form.getValues();
    try {
      const payload = {
        ...values,
        startingBid: Number(values.startingBid),
        reservePrice: values.reservePrice ? Number(values.reservePrice) : undefined,
        buyNowPrice: values.buyNowPrice ? Number(values.buyNowPrice) : undefined,
        minIncrement: Number(values.minIncrement),
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(values.endsAt).toISOString(),
        images,
      };
      const auction = await api.post<{ id: string }>('/api/auctions', payload);
      if (publish) await api.post(`/api/auctions/${auction.id}/publish`);
      router.push('/dashboard/listings');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  if (user && user.role !== 'SELLER') return <p>Seller accounts only.</p>;

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
        {error && <p className="text-urgent-red text-body-sm">{error}</p>}
        <div className="flex gap-3">
          <button type="button" className="btn-secondary flex-1" onClick={() => submit(false)}>Save draft</button>
          <button type="button" className="btn-primary flex-1" onClick={() => submit(true)}>Publish</button>
        </div>
      </form>
    </div>
  );
}