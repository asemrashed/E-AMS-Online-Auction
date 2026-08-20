'use client';

import { useAuctionsQuery } from '@/hooks/useApi';

interface TickerAuction {
  id: string;
  title: string;
  currentBid: string;
  _count?: { bids: number };
}

export function MarketTicker() {
  const { data } = useAuctionsQuery('status=LIVE');
  const items = ((data ?? []) as TickerAuction[]).slice(0, 12);

  if (items.length === 0) return null;

  const renderItems = (keyPrefix: string) =>
    items.map((a, i) => (
      <span key={`${keyPrefix}-${a.id}-${i}`} className="inline-flex items-center gap-2 px-6 font-mono text-body-sm whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-success-green" />
        <span className="text-on-surface-variant">LOT #{a.id.slice(0, 6).toUpperCase()}</span>
        <span className="text-on-surface">{a.title.length > 28 ? a.title.slice(0, 28) + '…' : a.title}</span>
        <span className="text-primary font-semibold">${Number(a.currentBid).toLocaleString()}</span>
        <span className="text-outline">·</span>
        <span className="text-on-surface-variant">{a._count?.bids ?? 0} bids</span>
      </span>
    ));

  return (
    <div className="border-b border-border-muted bg-surface-container-lowest overflow-hidden">
      <div className="ticker-track py-2">
        {renderItems('a')}
        {renderItems('b')}
      </div>
    </div>
  );
}