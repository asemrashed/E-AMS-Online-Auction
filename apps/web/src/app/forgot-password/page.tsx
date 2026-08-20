'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'email' | 'reset'>('email');
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
            if (step === 'email') {
              const res = await api.post<{ message: string }>('/api/auth/forgot-password', { email }, false);
              setInfo(res.message);
              setStep('reset');
            } else {
              await api.post('/api/auth/reset-password', { email, code: code.trim().toUpperCase(), password }, false);
              router.push('/login?reset=1');
            }
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Request failed');
          } finally {
            setPending(false);
          }
        }}
      >
        <h1 className="text-headline-lg text-primary text-center mb-1">Reset password</h1>
        <p className="text-body-sm text-on-surface-variant text-center mb-6">
          {step === 'email' ? 'We will email a 5-character code to reset your password.' : 'Enter the code and your new password.'}
        </p>
        <label className="text-label-caps text-outline">Email</label>
        <input type="email" className="input-field mb-4" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {step === 'reset' && (
          <>
            <label className="text-label-caps text-outline">Code</label>
            <input
              className="input-field mb-4 font-mono tracking-[0.4em] uppercase text-center"
              maxLength={5}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
            />
            <label className="text-label-caps text-outline">New password</label>
            <input type="password" className="input-field mb-4" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </>
        )}
        {error && <p className="text-urgent-red text-body-sm mb-4">{error}</p>}
        {info && <p className="text-success-green text-body-sm mb-4">{info}</p>}
        <button className="btn-primary w-full mb-4" disabled={pending}>
          {pending ? 'Please wait…' : step === 'email' ? 'Send code' : 'Update password'}
        </button>
        <p className="text-body-sm text-center"><Link href="/login" className="text-primary">Back to login</Link></p>
      </form>
    </main>
  );
}
