'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ImageUploader } from '@/components/ImageUploader';
import { useAuthStore } from '@/store/auth';
import { keys, useMeQuery } from '@/hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';

export default function KycPage() {
  const user = useAuthStore((s) => s.user);
  const me = useMeQuery();
  const qc = useQueryClient();
  const [docs, setDocs] = useState<string[]>([]);
  const submit = useMutation({
    mutationFn: () => api.post('/api/users/kyc/submit', { documents: docs }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }),
  });
  const status = me.data?.kycStatus ?? user?.kycStatus;

  return (
    <div className="max-w-xl">
      <h1 className="text-headline-lg mb-1">KYC verification</h1>
      <p className="text-body-md text-on-surface-variant mb-6">Required before bidding or publishing. Current status: <strong>{status}</strong></p>
      <div className="card p-6 space-y-4">
        <ImageUploader urls={docs} onChange={setDocs} label="ID / business documents" />
        {submit.isError && <p className="text-urgent-red text-body-sm">{(submit.error as Error).message}</p>}
        {submit.isSuccess && <p className="text-success-green text-body-sm">Submitted for review.</p>}
        <button className="btn-primary" disabled={submit.isPending || docs.length === 0} onClick={() => submit.mutate()}>Submit for review</button>
      </div>
    </div>
  );
}