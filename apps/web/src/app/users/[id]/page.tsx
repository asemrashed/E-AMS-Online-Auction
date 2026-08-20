'use client';

import { useQuery } from '@tanstack/react-query';
import { MapPin, Phone, Star, Store, ShoppingBag, Calendar } from 'lucide-react';
import { api } from '@/lib/api';

type PublicProfile = {
  id: string;
  fullName: string;
  organization: string | null;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: string;
  memberSince: string;
  address: { line1: string; city: string; state: string; country: string } | null;
  stats: { totalSells: number; totalBuys: number; ratingAvg: number | null; ratingCount: number };
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    fromUser: { id: string; fullName: string; avatarUrl: string | null };
  }>;
};

export default function PublicProfilePage({ params }: { params: { id: string } }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['public-profile', params.id],
    queryFn: () => api.get<PublicProfile>(`/api/users/${params.id}/profile`, false),
  });

  if (isLoading) return <main className="max-w-3xl mx-auto px-margin-desktop py-16">Loading profile…</main>;
  if (error || !data) return <main className="max-w-3xl mx-auto px-margin-desktop py-16">Profile not found.</main>;

  const loc = data.address
    ? [data.address.line1, data.address.city, data.address.state, data.address.country].filter(Boolean).join(', ')
    : null;

  return (
    <main className="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop py-12">
      <div className="card p-8 mb-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-surface-container shrink-0">
            {data.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-headline-md text-outline">
                {data.fullName.slice(0, 1)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-label-caps text-outline mb-1">{data.role.replace('_', ' ')}</p>
            <h1 className="text-headline-lg mb-1">{data.fullName}</h1>
            {data.organization && <p className="text-body-md text-on-surface-variant mb-3">{data.organization}</p>}
            <div className="flex flex-wrap gap-4 text-body-sm text-on-surface-variant">
              {loc && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{loc}</span>}
              {data.phone && <span className="flex items-center gap-1"><Phone className="w-4 h-4" />{data.phone}</span>}
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />Member since {new Date(data.memberSince).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        {data.bio && <p className="text-body-md text-on-surface-variant mt-6 whitespace-pre-line">{data.bio}</p>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat icon={Store} label="Total sells" value={String(data.stats.totalSells)} />
        <Stat icon={ShoppingBag} label="Total buys" value={String(data.stats.totalBuys)} />
        <Stat icon={Star} label="Rating" value={data.stats.ratingAvg != null ? `${data.stats.ratingAvg} / 5` : '—'} />
        <Stat icon={Star} label="Reviews" value={String(data.stats.ratingCount)} />
      </div>

      <section className="card p-6">
        <h2 className="text-headline-md mb-4">Reviews</h2>
        {data.reviews.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">No reviews yet.</p>
        ) : (
          <div className="divide-y divide-border-muted">
            {data.reviews.map((r) => (
              <div key={r.id} className="py-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium">{r.fromUser.fullName}</p>
                  <p className="text-body-sm text-tertiary">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
                </div>
                {r.comment && <p className="text-body-sm text-on-surface-variant">{r.comment}</p>}
                <p className="text-body-sm text-outline mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: string }) {
  return (
    <div className="card p-4">
      <Icon className="w-4 h-4 text-primary mb-2" />
      <p className="text-label-caps text-outline">{label}</p>
      <p className="text-headline-md">{value}</p>
    </div>
  );
}
