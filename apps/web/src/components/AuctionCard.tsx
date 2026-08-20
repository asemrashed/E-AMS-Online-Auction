'use client';

import Link from 'next/link';
import { CountdownTimer } from './CountdownTimer';
import { AddToCartButton } from './AddToCartButton';
import type { Auction } from '@/types';

export function AuctionCard({ auction }: { auction: Auction }) {
  return (
    <article className="card overflow-hidden hover:shadow-level3 transition-shadow">
      <Link href={`/auctions/${auction.slug}`} className="block">
        <div className="aspect-video bg-surface-container-high flex items-center justify-center text-outline text-body-sm">
          {auction.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={auction.images[0]} alt={auction.title} className="w-full h-full object-cover" />
          ) : (
            'No image'
          )}
        </div>
        <div className="p-4 pb-0">
          <div className="flex items-center justify-between mb-2">
            <span className="badge-live">{auction.status === 'LIVE' ? 'LIVE' : auction.status}</span>
            <CountdownTimer endsAt={auction.endsAt} />
          </div>
          <h3 className="font-headline text-body-lg font-semibold mb-1 line-clamp-2">{auction.title}</h3>
          <p className="text-body-sm text-on-surface-variant mb-3">{auction.category}</p>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-label-caps text-outline">CURRENT BID</p>
              <p className="font-mono text-body-lg text-primary font-semibold">${Number(auction.currentBid).toLocaleString()}</p>
            </div>
            <span className="text-body-sm text-on-surface-variant">{auction._count?.bids ?? 0} bids</span>
          </div>
        </div>
      </Link>
      <div className="px-4 pb-4 space-y-2">
        {auction.seller?.id && (
          <p className="text-body-sm text-on-surface-variant">
            Seller:{' '}
            <Link href={`/users/${auction.seller.id}`} className="text-primary">
              {auction.seller.fullName}
            </Link>
          </p>
        )}
        <AddToCartButton auction={auction} />
      </div>
    </article>
  );
}
