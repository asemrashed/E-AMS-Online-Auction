'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMfaVerify } from '@/hooks/useAuth';
import { dashboardHome } from '@/store/auth';

function MfaForm() {
  const router = useRouter();
  const userId = useSearchParams().get('userId') || '';
  const verify = useMfaVerify();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="flex items-center justify-center py-24 px-4">
      <form
        className="card w-full max-w-md p-8"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          try {
            const res = await verify.mutateAsync({ userId, code });
            router.push(dashboardHome(res.user.role));
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Invalid code');
          }
        }}
      >
        <h1 className="text-headline-lg mb-4">Authenticator code</h1>
        <input className="input-field font-mono mb-4" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
        {error && <p className="text-urgent-red text-body-sm mb-4">{error}</p>}
        <button className="btn-primary w-full" disabled={verify.isPending}>Verify</button>
      </form>
    </main>
  );
}

export default function LoginMfaPage() {
  return (
    <Suspense fallback={<main className="py-24 text-center">Loading…</main>}>
      <MfaForm />
    </Suspense>
  );
}