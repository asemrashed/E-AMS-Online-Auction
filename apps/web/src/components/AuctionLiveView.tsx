'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BidHistory, BidPanel, type LiveBidEvent } from '@/components/BidPanel';
import { AuctionGallery } from '@/components/AuctionGallery';
import { FlagAuction } from '@/components/FlagAuction';
import { AddToCartButton } from '@/components/AddToCartButton';
import { useAuctionQuery } from '@/hooks/useApi';
import type { Auction, Bid } from '@/lib/schemas';

export function AuctionLiveView({ slug, initial }: { slug: string; initial: Auction & { bids: Bid[] } }) {
  const query = useAuctionQuery(slug);
  const auction = query.data ?? initial;
  const [bids, setBids] = useState<Bid[]>(initial.bids ?? []);

  useEffect(() => {
    if (!query.data?.bids) return;
    setBids((prev) => {
      const map = new Map(prev.map((b) => [b.id, b]));
      for (const b of query.data.bids) map.set(b.id, b);
      return [...map.values()].sort((a, b) => Number(b.amount) - Number(a.amount));
    });
  }, [query.data?.bids]);

  const onLiveBid = useCallback((event: LiveBidEvent) => {
    setBids((prev) => {
      const next: Bid = {
        id: event.id || `${event.auctionId}-${event.createdAt}`,
        auctionId: event.auctionId,
        bidderId: event.bidderId || 'unknown',
        amount: String(event.currentBid),
        createdAt: typeof event.createdAt === 'string' ? event.createdAt : new Date().toISOString(),
        bidder: event.bidder,
      };
      const without = prev.filter((b) => b.id !== next.id);
      return [next, ...without].sort((a, b) => Number(b.amount) - Number(a.amount));
    });
  }, []);

  return (
    <main className="max-w-container-max mx-auto px-margin-desktop py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <p className="text-body-sm text-on-surface-variant mb-2">Auctions / {auction.category}</p>
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-headline-lg">{auction.title}</h1>
          <AddToCartButton auction={auction} />
        </div>
        <p className="text-body-sm text-outline mb-6">Lot #{auction.id.slice(0, 8).toUpperCase()}</p>

        <AuctionGallery images={auction.images ?? []} title={auction.title} />

        {auction.seller?.id && (
          <Link href={`/users/${auction.seller.id}`} className="card p-5 mb-6 flex items-center gap-4 hover:border-primary">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container shrink-0">
              {auction.seller.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={auction.seller.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-outline">{auction.seller.fullName.slice(0, 1)}</div>
              )}
            </div>
            <div>
              <p className="text-label-caps text-outline">Seller</p>
              <p className="font-semibold">{auction.seller.fullName}</p>
              {auction.seller.organization && <p className="text-body-sm text-on-surface-variant">{auction.seller.organization}</p>}
              <p className="text-body-sm text-primary mt-1">View profile</p>
            </div>
          </Link>
        )}

        <div className="card p-6 mb-6">
          <h2 className="text-headline-md mb-3">Description & Specs</h2>
          <p className="text-body-md text-on-surface-variant whitespace-pre-line">{auction.description}</p>
          <dl className="grid grid-cols-2 gap-4 mt-6 text-body-sm">
            <div><dt className="text-outline">Category</dt><dd className="font-medium">{auction.category}</dd></div>
            <div><dt className="text-outline">Condition</dt><dd className="font-medium">{auction.condition}</dd></div>
          </dl>
        </div>

        <BidHistory bids={bids} />
        <FlagAuction auctionId={auction.id} />
      </div>
      <div className="min-h-0 lg:h-full">
        <BidPanel auction={initial} leadingBidderId={bids[0]?.bidderId} onLiveBid={onLiveBid} />
      </div>
    </main>
  );
}