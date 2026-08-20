'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { bankSchema } from '@/lib/schemas';
import { keys, useBankQuery } from '@/hooks/useApi';
import { useAuthStore } from '@/store/auth';
import { z } from 'zod';

type Form = z.infer<typeof bankSchema>;

export default function BankSetupPage() {
  const user = useAuthStore((s) => s.user);
  const { data: bank } = useBankQuery(user?.role === 'SELLER');
  const form = useForm<Form>({ resolver: zodResolver(bankSchema) });
  const qc = useQueryClient();

  useEffect(() => {
    if (bank) form.reset(bank);
  }, [bank, form]);

  const save = useMutation({
    mutationFn: (values: Form) => (bank ? api.patch('/api/seller/bank', values) : api.post('/api/seller/bank', values)),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.bank }),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-headline-lg mb-1">Bank Account</h1>
      <p className="text-body-md text-on-surface-variant mb-6">Required and <strong>admin-verified</strong> before you can publish listings. Payouts are 95% of the sale; transfers are recorded by ops (not an automatic wire).</p>
      {bank ? (
        <div className={`card p-4 mb-6 ${bank.verified ? 'border-l-4 border-l-success-green' : 'border-l-4 border-l-tertiary'}`}>
          <p className="font-medium">{bank.verified ? 'Verified' : 'Pending admin verification'}</p>
        </div>
      ) : null}
      <form className="card p-6 space-y-4" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
        <div><label className="text-label-caps text-outline">Account holder</label><input className="input-field" {...form.register('accountName')} /></div>
        <div><label className="text-label-caps text-outline">Account number</label><input className="input-field" {...form.register('accountNumber')} /></div>
        <div><label className="text-label-caps text-outline">Bank name</label><input className="input-field" {...form.register('bankName')} /></div>
        <div><label className="text-label-caps text-outline">Routing / branch</label><input className="input-field" {...form.register('routingOrBranch')} /></div>
        {save.isError && <p className="text-urgent-red text-body-sm">{(save.error as Error).message}</p>}
        {save.isSuccess && <p className="text-primary text-body-sm">Saved. Editing resets verification.</p>}
        <button className="btn-primary w-full" disabled={save.isPending}>{bank ? 'Update' : 'Save'} bank details</button>
      </form>
    </div>
  );
}