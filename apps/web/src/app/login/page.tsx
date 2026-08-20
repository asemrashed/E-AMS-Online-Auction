'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/lib/schemas';
import { useLogin } from '@/hooks/useAuth';
import { dashboardHome } from '@/store/auth';
import { z } from 'zod';

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get('next');
  const reset = useSearchParams().get('reset');
  const login = useLogin();
  const form = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="flex items-center justify-center py-24 px-4">
      <form
        className="card w-full max-w-md p-8"
        onSubmit={form.handleSubmit(async (values) => {
          setError(null);
          try {
            const res = await login.mutateAsync(values);
            if (res.emailVerificationRequired && res.email) {
              router.push(`/verify-email?email=${encodeURIComponent(res.email)}`);
              return;
            }
            if (res.mfaRequired && res.userId) {
              router.push(`/login/mfa?userId=${res.userId}`);
              return;
            }
            router.push(next || dashboardHome(res.user?.role));
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Login failed');
          }
        })}
      >
        <h1 className="text-headline-lg text-primary text-center mb-1">e-AMS</h1>
        <p className="text-body-sm text-on-surface-variant text-center mb-6">Secure institutional access</p>
        <label className="text-label-caps text-outline">Email</label>
        <input type="email" className="input-field mb-4" {...form.register('email')} />
        <label className="text-label-caps text-outline">Password</label>
        <input type="password" className="input-field mb-2" {...form.register('password')} />
        <p className="text-body-sm mb-6"><Link href="/forgot-password" className="text-primary">Forgot password?</Link></p>
        {reset && <p className="text-success-green text-body-sm mb-4 text-center">Password updated. Log in with your new password.</p>}
        {error && <p className="text-urgent-red text-body-sm mb-4">{error}</p>}
        <button className="btn-primary w-full mb-4" disabled={login.isPending}>{login.isPending ? 'Authenticating…' : 'Authenticate'}</button>
        <p className="text-body-sm text-center">No account? <Link href="/register" className="text-primary">Sign up</Link></p>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<main className="py-24 text-center">Loading…</main>}><LoginForm /></Suspense>;
}