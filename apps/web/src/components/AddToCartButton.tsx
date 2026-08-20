'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart } from 'lucide-react';
import { api } from '@/lib/api';
import { keys, useCartQuery } from '@/hooks/useApi';
import { useAuthStore } from '@/store/auth';
import type { Auction } from '@/lib/schemas';

export function AddToCartButton({
  auction,
  variant = 'secondary',
}: {
  auction: Auction;
  variant?: 'primary' | 'secondary';
}) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const qc = useQueryClient();
  const { data } = useCartQuery(user?.role === 'BUYER');
  const inCart = data?.items?.some((i) => i.auction.id === auction.id);
  const add = useMutation({
    mutationFn: () => api.post(`/api/cart/${auction.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.cart }),
  });

  if (user && user.role !== 'BUYER') return null;
  if (auction.status === 'DRAFT' || auction.status === 'CANCELLED') return null;

  const cls = variant === 'primary' ? 'btn-primary text-body-sm' : 'btn-secondary text-body-sm';

  if (!user) {
    return (
      <a href="/login" className={cls} onClick={(e) => e.stopPropagation()}>
        <ShoppingCart className="w-4 h-4" /> Add to cart
      </a>
    );
  }

  if (inCart) {
    return (
      <button
        type="button"
        className={cls}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          router.push('/cart');
        }}
      >
        <ShoppingCart className="w-4 h-4" /> In cart
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={add.isPending}
      className={cls}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        add.mutate();
      }}
    >
      <ShoppingCart className="w-4 h-4" /> {add.isPending ? 'Adding…' : 'Add to cart'}
    </button>
  );
}

export function useStartCheckout() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (auctionId: string) => {
      await api.post(`/api/cart/${auctionId}`).catch(() => undefined);
      return api.post<{ id: string }>(`/api/orders/${auctionId}/checkout`);
    },
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: keys.cart });
      qc.invalidateQueries({ queryKey: keys.orders });
      router.push(`/checkout/${order.id}`);
    },
  });
}
