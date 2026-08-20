import { notFound } from 'next/navigation';
import { AuctionLiveView } from '@/components/AuctionLiveView';
import { serverGet } from '@/lib/server-api';
import type { Auction, Bid } from '@/lib/schemas';

export default async function AuctionDetailPage({ params }: { params: { slug: string } }) {
  const auction = await serverGet<Auction & { bids: Bid[] }>(`/api/auctions/${params.slug}`);
  if (!auction) notFound();
  return <AuctionLiveView slug={params.slug} initial={{ ...auction, bids: auction.bids ?? [] }} />;
}