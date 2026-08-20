'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { keys } from '@/hooks/useApi';
import { useAuthStore } from '@/store/auth';

export default function AdminBanksPage() {
  const user = useAuthStore((s) => s.user);
  const { data: banks = [] } = useQuery({
    queryKey: keys.adminBanks,
    enabled: !!user,
    queryFn: () => api.get<Array<{ sellerId: string; accountName: string; bankName: string; accountNumber: string; verified: boolean; seller: { fullName: string; email: string } }>>('/api/admin/banks'),
  });
  const qc = useQueryClient();
  const verify = useMutation({
    mutationFn: (sellerId: string) => api.patch(`/api/admin/bank/${sellerId}/verify`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.adminBanks }),
  });

  return (
    <div>
      <h1 className="text-headline-lg mb-6">Seller bank accounts</h1>
      <div className="card divide-y divide-border-muted">
        {banks.map((b) => (
          <div key={b.sellerId} className="p-5 flex justify-between">
            <div>
              <p className="font-medium">{b.seller.fullName}</p>
              <p className="text-body-sm text-on-surface-variant">{b.bankName} · {b.accountName} · {b.accountNumber}</p>
            </div>
            {b.verified ? <span className="text-success-green text-body-sm">Verified</span> : (
              <button className="btn-primary text-body-sm" onClick={() => verify.mutate(b.sellerId)}>Verify</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}