'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { userSchema } from '@/lib/schemas';
import { useAuthStore } from '@/store/auth';
import { getSocket } from '@/lib/socket';
import { applyTheme, readThemeMode } from '@/lib/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false },
  },
});

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();
  const pathname = usePathname();

  useEffect(() => {
    applyTheme(readThemeMode());
  }, [pathname]);

  useEffect(() => {
    applyTheme(readThemeMode());
    const token = typeof window !== 'undefined' ? localStorage.getItem('eams_access_token') : null;
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/api/users/me')
      .then((raw) => setUser(userSchema.parse(raw)))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [setUser, setLoading]);

  return <>{children}</>;
}

function LiveMarketBridge({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    const onMarket = (payload: { auctionId: string; currentBid: string | number; endsAt: string; bidCountDelta?: number }) => {
      qc.setQueriesData({ queryKey: ['auctions'] }, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.map((a: { id: string; _count?: { bids?: number } }) =>
          a.id === payload.auctionId
            ? {
                ...a,
                currentBid: String(payload.currentBid),
                endsAt: payload.endsAt,
                _count: {
                  bids: (a._count?.bids ?? 0) + (payload.bidCountDelta ?? 0),
                },
              }
            : a
        );
      });
    };
    socket.on('market:bid', onMarket);
    return () => {
      socket.off('market:bid', onMarket);
    };
  }, [qc]);

  return <>{children}</>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <LiveMarketBridge>{children}</LiveMarketBridge>
      </AuthBootstrap>
    </QueryClientProvider>
  );
}