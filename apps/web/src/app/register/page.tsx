'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@/lib/schemas';
import { useRegister } from '@/hooks/useAuth';
import { z } from 'zod';

export default function RegisterPage() {
  const router = useRouter();
  const registerMut = useRegister();
  const [role, setRole] = useState<'BUYER' | 'SELLER'>('BUYER');
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'BUYER' },
  });
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="flex items-center justify-center py-16 px-4">
      <form
        className="card w-full max-w-lg p-8"
        onSubmit={form.handleSubmit(async (values) => {
          setError(null);
          try {
            await registerMut.mutateAsync({ ...values, role });
            router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed');
          }
        })}
      >
        <h1 className="text-headline-lg mb-1">Create Account</h1>
        <p className="text-body-sm text-on-surface-variant mb-6">Role is permanent for this account.</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {(['BUYER', 'SELLER'] as const).map((r) => (
            <button key={r} type="button" onClick={() => { setRole(r); form.setValue('role', r); }} className={clsx('border rounded-md p-4 text-left', role === r ? 'border-primary bg-primary/5' : 'border-border-muted')}>
              <p className="font-semibold">{r === 'BUYER' ? 'Buy' : 'Sell'}</p>
            </button>
          ))}
        </div>
        <label className="text-label-caps text-outline">Full name</label>
        <input className="input-field mb-4" {...form.register('fullName')} />
        {role === 'SELLER' && (
          <>
            <label className="text-label-caps text-outline">Organization</label>
            <input className="input-field mb-4" {...form.register('organization')} />
          </>
        )}
        <label className="text-label-caps text-outline">Email</label>
        <input type="email" className="input-field mb-4" {...form.register('email')} />
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-label-caps text-outline">Password</label>
            <input type="password" className="input-field" {...form.register('password')} />
          </div>
          <div>
            <label className="text-label-caps text-outline">Phone</label>
            <input className="input-field" {...form.register('phone')} />
          </div>
        </div>
        <p className="text-body-sm text-on-surface-variant mb-6">
          After signup, complete KYC. Sellers also add a bank account (admin must verify it before publish). MFA is optional in Security settings.
        </p>
        {error && <p className="text-urgent-red text-body-sm mb-4">{error}</p>}
        <button className="btn-primary w-full mb-4" disabled={registerMut.isPending}>Sign up</button>
        <p className="text-body-sm text-center">Have an account? <Link href="/login" className="text-primary">Log in</Link></p>
      </form>
    </main>
  );
}