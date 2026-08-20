'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth';
import { useBuyNow, usePlaceBid } from '@/hooks/useApi';
import { CountdownTimer } from './CountdownTimer';
import type { Auction, Bid } from '@/lib/schemas';

export type LiveBidEvent = {
  auctionId: string;
  id?: string;
  amount: number;
  currentBid: string | number;
  endsAt: string;
  reserveMet?: boolean;
  createdAt: string;
  bidder?: { fullName: string };
  bidderId?: string;
};

export function BidPanel({
  auction: initial,
  leadingBidderId: initialLeading,
  onLiveBid,
}: {
  auction: Auction;
  leadingBidderId?: string;
  onLiveBid?: (event: LiveBidEvent) => void;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [auction, setAuction] = useState(initial);
  const [leadingBidderId, setLeadingBidderId] = useState(initialLeading);
  useEffect(() => {
    if (initialLeading) setLeadingBidderId(initialLeading);
  }, [initialLeading]);
  const [bidAmount, setBidAmount] = useState(String(Number(initial.currentBid) + Number(initial.minIncrement)));
  const [maxProxy, setMaxProxy] = useState('');
  const [error, setError] = useState<string | null>(null);
  const placeBid = usePlaceBid();
  const buyNow = useBuyNow();

  useEffect(() => {
    const socket = getSocket();
    const join = () => socket.emit('auction:join', auction.id);

    const apply = (payload: LiveBidEvent) => {
      if (payload.auctionId !== auction.id) return;
      setAuction((prev) => ({
        ...prev,
        currentBid: String(payload.currentBid),
        endsAt: payload.endsAt ?? prev.endsAt,
        reserveMet: payload.reserveMet ?? prev.reserveMet,
      }));
      setBidAmount(String(Number(payload.currentBid) + Number(auction.minIncrement)));
      if (payload.bidderId) setLeadingBidderId(payload.bidderId);
      onLiveBid?.(payload);
    };
    const onMarket = (payload: { auctionId: string; currentBid: string | number; endsAt?: string }) => {
      if (payload.auctionId !== auction.id) return;
      setAuction((prev) => ({
        ...prev,
        currentBid: String(payload.currentBid),
        endsAt: payload.endsAt ?? prev.endsAt,
      }));
      setBidAmount(String(Number(payload.currentBid) + Number(auction.minIncrement)));
    };

    const onExtended = (payload: { auctionId: string; endsAt: string }) => {
      if (payload.auctionId !== auction.id) return;
      setAuction((prev) => ({ ...prev, endsAt: payload.endsAt }));
    };
    const onEnded = (payload: { auctionId: string; currentBid?: string | number }) => {
      if (payload.auctionId !== auction.id) return;
      setAuction((prev) => ({
        ...prev,
        status: 'ENDED',
        currentBid: payload.currentBid != null ? String(payload.currentBid) : prev.currentBid,
      }));
    };

    if (socket.connected) join();
    socket.on('connect', join);
    socket.on('bid:new', apply);
    socket.on('market:bid', onMarket);
    socket.on('auction:extended', onExtended);
    socket.on('auction:ended', onEnded);

    return () => {
      socket.emit('auction:leave', auction.id);
      socket.off('connect', join);
      socket.off('bid:new', apply);
      socket.off('market:bid', onMarket);
      socket.off('auction:extended', onExtended);
      socket.off('auction:ended', onEnded);
    };
  }, [auction.id, auction.minIncrement, onLiveBid]);

  async function submitBid() {
    setError(null);
    try {
      const result = await placeBid.mutateAsync({
        auctionId: auction.id,
        amount: Number(bidAmount),
        isProxy: Boolean(maxProxy),
        maxProxyAmt: maxProxy ? Number(maxProxy) : undefined,
      }) as { auction?: Auction; bid?: Bid };
      if (result.auction) {
        setAuction((prev) => ({
          ...prev,
          currentBid: String(result.auction!.currentBid),
          endsAt: result.auction!.endsAt,
          reserveMet: result.auction!.reserveMet,
        }));
        setBidAmount(String(Number(result.auction.currentBid) + Number(auction.minIncrement)));
      }
      if (result.bid) {
        setLeadingBidderId(user?.id ?? result.bid.bidderId);
        onLiveBid?.({
          auctionId: auction.id,
          id: result.bid.id,
          amount: Number(result.bid.amount),
          currentBid: result.auction ? result.auction.currentBid : result.bid.amount,
          endsAt: result.auction?.endsAt ?? auction.endsAt,
          reserveMet: result.auction?.reserveMet,
          createdAt: result.bid.createdAt,
          bidderId: user?.id,
          bidder: user ? { fullName: user.fullName } : undefined,
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Bid failed');
    }
  }

  async function submitBuyNow() {
    setError(null);
    try {
      await buyNow.mutateAsync(auction.id);
      router.push('/cart');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Buy Now failed');
    }
  }

  const isBuyer = user?.role === 'BUYER';
  const holdingLead = Boolean(user && leadingBidderId && leadingBidderId === user.id);
  const minNext = Number(auction.currentBid) + Number(auction.minIncrement);
  const live = auction.status === 'LIVE';
  const increment = Number(auction.minIncrement);

  return (
    <div
      className="card p-6 sticky z-20"
      style={{ top: 'calc(var(--app-header-height, 9rem) + 12px)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-label-caps text-outline">{live ? 'ENDS IN' : auction.status}</span>
        {live && <CountdownTimer endsAt={auction.endsAt} />}
      </div>

      <p className="text-label-caps text-outline mb-1">CURRENT BID</p>
      <p className="font-mono text-headline-md text-primary mb-1">${Number(auction.currentBid).toLocaleString()}</p>
      <p className="text-body-sm text-success-green mb-4">{auction.reserveMet ? '● Reserve Met' : '○ Reserve not met'}</p>

      <p className="text-body-sm text-on-surface-variant mb-2">Min next bid: ${minNext.toLocaleString()}</p>

      {!live ? (
        <p className="text-body-sm text-on-surface-variant border border-border-muted rounded p-3">This auction is no longer live.</p>
      ) : !user ? (
        <a href="/login" className="btn-primary w-full text-center block">Log in to bid</a>
      ) : !isBuyer ? (
        <p className="text-body-sm text-on-surface-variant border border-border-muted rounded p-3">
          Only buyer accounts can place bids.
        </p>
      ) : user.kycStatus !== 'VERIFIED' ? (
        <p className="text-body-sm border border-border-muted rounded p-3">
          Complete <a className="text-primary" href="/dashboard/kyc">KYC verification</a> before bidding.
        </p>
      ) : (
        <>
          <div className="flex gap-2 mb-3">
            {[1, 5, 10].map((k) => (
              <button
                key={k}
                onClick={() => setBidAmount(String(Number(auction.currentBid) + k * increment))}
                className="btn-secondary flex-1 text-body-sm"
              >
                +{k}×
              </button>
            ))}
          </div>
          <input type="number" className="input-field font-mono mb-3" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} />
          <label className="text-label-caps text-outline">Proxy max (optional)</label>
          <input type="number" className="input-field font-mono mb-3" value={maxProxy} onChange={(e) => setMaxProxy(e.target.value)} placeholder="Auto-bid up to" />
          {error && <p className="text-body-sm text-urgent-red mb-3">{error}</p>}
          {holdingLead && (
            <p className="text-body-sm text-on-surface-variant border border-border-muted rounded p-3 mb-3">
              You hold the latest bid. You can bid again after someone else bids.
            </p>
          )}
          <button onClick={submitBid} disabled={placeBid.isPending || holdingLead} className="btn-primary w-full mb-2 disabled:opacity-50">
            {placeBid.isPending ? 'Placing bid...' : 'Place Bid'}
          </button>
          {auction.buyNowPrice && (
            <button onClick={submitBuyNow} disabled={buyNow.isPending} className="btn-secondary w-full">
              Buy Now for ${Number(auction.buyNowPrice).toLocaleString()}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function BidHistory({ bids }: { bids: Bid[] }) {
  return (
    <div className="card p-6 mb-6">
      <h2 className="text-headline-md mb-3">Bid History ({bids.length})</h2>
      <div className="divide-y divide-border-muted">
        {bids.length ? (
          bids.map((bid) => (
            <div key={bid.id} className="flex justify-between py-3">
              <div>
                <p className="font-mono text-primary font-semibold">${Number(bid.amount).toLocaleString()}</p>
                <p className="text-body-sm text-outline">{new Date(bid.createdAt).toLocaleString()}</p>
              </div>
              <span className="text-body-sm text-on-surface-variant">{bid.bidder?.fullName ?? 'Bidder'}</span>
            </div>
          ))
        ) : (
          <p className="text-body-sm text-on-surface-variant py-3">No bids yet — be the first.</p>
        )}
      </div>
    </div>
  );
}