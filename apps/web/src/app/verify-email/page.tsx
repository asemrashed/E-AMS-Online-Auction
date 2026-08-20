'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore, dashboardHome } from '@/store/auth';
import { userSchema } from '@/lib/schemas';

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const completeLogin = useAuthStore((s) => s.completeLogin);
  const [email, setEmail] = useState(params.get('email') || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <main className="flex items-center justify-center py-24 px-4">
      <form
        className="card w-full max-w-md p-8"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setPending(true);
          try {
            const res = await api.post<{ user: unknown; accessToken: string; refreshToken: string }>(
              '/api/auth/verify-email',
              { email, code: code.trim().toUpperCase() },
              false
            );
            completeLogin(userSchema.parse(res.user), res.accessToken, res.refreshToken);
            router.push(dashboardHome(userSchema.parse(res.user).role));
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Verification failed');
          } finally {
            setPending(false);
          }
        }}
      >
        <h1 className="text-headline-lg text-primary text-center mb-1">Verify email</h1>
        <p className="text-body-sm text-on-surface-variant text-center mb-6">
          Enter the 5-character code sent to your inbox.
        </p>
        <label className="text-label-caps text-outline">Email</label>
        <input type="email" className="input-field mb-4" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="text-label-caps text-outline">Code</label>
        <input
          className="input-field mb-4 font-mono tracking-[0.4em] uppercase text-center"
          maxLength={5}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC12"
        />
        {error && <p className="text-urgent-red text-body-sm mb-4">{error}</p>}
        {info && <p className="text-success-green text-body-sm mb-4">{info}</p>}
        <button className="btn-primary w-full mb-3" disabled={pending}>{pending ? 'Verifying…' : 'Verify and continue'}</button>
        <button
          type="button"
          className="btn-secondary w-full mb-4"
          onClick={async () => {
            setError(null);
            try {
              const res = await api.post<{ message: string }>('/api/auth/resend-verification', { email }, false);
              setInfo(res.message);
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : 'Could not resend');
            }
          }}
        >
          Resend code
        </button>
        <p className="text-body-sm text-center"><Link href="/login" className="text-primary">Back to login</Link></p>
      </form>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="py-24 text-center">Loading…</main>}>
      <VerifyForm />
    </Suspense>
  );
}
