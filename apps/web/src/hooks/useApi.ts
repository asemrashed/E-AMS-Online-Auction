'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '@/lib/api';
import { auctionSchema, bidSchema, notificationSchema, orderSchema, userSchema } from '@/lib/schemas';

export const keys = {
  me: ['me'] as const,
  auctions: (q: string) => ['auctions', q] as const,
  auction: (slug: string) => ['auction', slug] as const,
  cart: ['cart'] as const,
  orders: ['orders'] as const,
  order: (id: string) => ['order', id] as const,
  listings: ['seller-listings'] as const,
  sales: ['seller-sales'] as const,
  bank: ['seller-bank'] as const,
  payoutsMine: ['payouts-mine'] as const,
  payoutsAdmin: ['payouts-admin'] as const,
  watchlist: ['watchlist'] as const,
  myBids: ['my-bids'] as const,
  notifications: ['notifications'] as const,
  adminUsers: ['admin-users'] as const,
  adminFlags: ['admin-flags'] as const,
  adminAnalytics: ['admin-analytics'] as const,
  adminBanks: ['admin-banks'] as const,
  admins: ['super-admins'] as const,
  commission: ['commission-report'] as const,
};

export function useMeQuery() {
  return useQuery({
    queryKey: keys.me,
    queryFn: async () => userSchema.parse(await api.get('/api/users/me')),
  });
}

export function useAuctionsQuery(search: string) {
  return useQuery({
    queryKey: keys.auctions(search),
    queryFn: async () => z.array(auctionSchema).parse(await api.get(`/api/auctions?${search}`, false)),
  });
}

export function useAuctionQuery(slug: string) {
  return useQuery({
    queryKey: keys.auction(slug),
    queryFn: async () => {
      const raw = await api.get(`/api/auctions/${slug}`, false);
      const base = auctionSchema.parse(raw);
      const bids = z.array(bidSchema).optional().parse((raw as { bids?: unknown }).bids);
      return { ...base, bids: bids ?? [] };
    },
  });
}

export function useCartQuery(enabled: boolean) {
  return useQuery({
    queryKey: keys.cart,
    enabled,
    queryFn: async () => api.get<{ items: { id: string; auction: z.infer<typeof auctionSchema> }[] }>('/api/cart'),
  });
}

export function useOrdersQuery(enabled: boolean) {
  return useQuery({
    queryKey: keys.orders,
    enabled,
    queryFn: async () => z.array(orderSchema).parse(await api.get('/api/orders')),
  });
}

export function useOrderQuery(id: string) {
  return useQuery({
    queryKey: keys.order(id),
    queryFn: async () => orderSchema.parse(await api.get(`/api/orders/${id}`)),
  });
}

export function useListingsQuery(enabled: boolean) {
  return useQuery({
    queryKey: keys.listings,
    enabled,
    queryFn: async () => z.array(auctionSchema).parse(await api.get('/api/seller/listings')),
  });
}

export function useSalesQuery(enabled: boolean) {
  return useQuery({
    queryKey: keys.sales,
    enabled,
    queryFn: async () => z.array(orderSchema).parse(await api.get('/api/seller/sales')),
  });
}

export function useBankQuery(enabled: boolean) {
  return useQuery({
    queryKey: keys.bank,
    enabled,
    queryFn: async () =>
      api.get<{
        accountName: string;
        accountNumber: string;
        bankName: string;
        routingOrBranch: string;
        verified: boolean;
      } | null>('/api/seller/bank'),
  });
}

export function useWatchlistQuery(enabled: boolean) {
  return useQuery({
    queryKey: keys.watchlist,
    enabled,
    queryFn: async () => api.get<Array<{ id: string; auction: z.infer<typeof auctionSchema> }>>('/api/watchlist'),
  });
}

export function useMyBidsQuery(enabled: boolean) {
  return useQuery({
    queryKey: keys.myBids,
    enabled,
    queryFn: async () => z.array(bidSchema).parse(await api.get('/api/bids/mine')),
  });
}

export function useNotificationsQuery(enabled: boolean) {
  return useQuery({
    queryKey: keys.notifications,
    enabled,
    queryFn: async () => z.array(notificationSchema).parse(await api.get('/api/notifications')),
  });
}

export function usePlaceBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { auctionId: string; amount: number; isProxy?: boolean; maxProxyAmt?: number }) =>
      api.post(`/api/bids/auctions/${args.auctionId}`, {
        amount: args.amount,
        isProxy: args.isProxy,
        maxProxyAmt: args.maxProxyAmt,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auction'] }),
  });
}

export function useBuyNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (auctionId: string) => api.post(`/api/auctions/${auctionId}/buy-now`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.cart });
      qc.invalidateQueries({ queryKey: ['auction'] });
    },
  });
}

export function useUploadSignature() {
  return useMutation({
    mutationFn: () => api.post<{ timestamp: number; signature: string; folder: string; cloudName: string; apiKey: string }>('/api/uploads/signature'),
  });
}