'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export function FlagAuction({ auctionId }: { auctionId: string }) {
  const user = useAuthStore((s) => s.user);
  const [reason, setReason] = useState('');
  const [open, setOpen] = useState(false);
  const flag = useMutation({
    mutationFn: () => api.post(`/api/auctions/${auctionId}/flag`, { reason }),
    onSuccess: () => { setOpen(false); setReason(''); },
  });
  if (!user) return null;
  return (
    <div className="card p-4">
      <button type="button" className="text-body-sm text-urgent-red" onClick={() => setOpen(!open)}>Report this listing</button>
      {open && (
        <div className="mt-3 space-y-2">
          <textarea className="input-field" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe the issue (min 8 characters)" />
          {flag.isError && <p className="text-body-sm text-urgent-red">{(flag.error as Error).message}</p>}
          {flag.isSuccess && <p className="text-body-sm text-success-green">Report submitted for review.</p>}
          <button className="btn-secondary text-body-sm" disabled={flag.isPending} onClick={() => flag.mutate()}>Submit report</button>
        </div>
      )}
    </div>
  );
}