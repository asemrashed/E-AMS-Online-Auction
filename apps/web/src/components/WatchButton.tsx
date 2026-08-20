'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { api } from '@/lib/api';
import { keys } from '@/hooks/useApi';
import { useAuthStore } from '@/store/auth';

export function WatchButton({ auctionId }: { auctionId: string }) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const add = useMutation({
    mutationFn: () => api.post(`/api/watchlist/${auctionId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.watchlist }),
  });
  if (user?.role !== 'BUYER') return null;
  return (
    <button onClick={() => add.mutate()} disabled={add.isPending} className="btn-secondary text-body-sm shrink-0">
      <Heart className="w-4 h-4" /> Watch
    </button>
  );
}