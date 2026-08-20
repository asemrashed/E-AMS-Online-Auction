'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ImageUploader } from '@/components/ImageUploader';
import { useAuthStore } from '@/store/auth';
import { keys, useMeQuery } from '@/hooks/useApi';
import { userSchema } from '@/lib/schemas';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const me = useMeQuery();
  const profile = me.data ?? user;
  const qc = useQueryClient();
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [avatar, setAvatar] = useState<string[]>(profile?.avatarUrl ? [profile.avatarUrl] : []);
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [organization, setOrganization] = useState(profile?.organization ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [line1, setLine1] = useState(profile?.address?.line1 ?? '');
  const [city, setCity] = useState(profile?.address?.city ?? '');
  const [state, setState] = useState(profile?.address?.state ?? '');
  const [country, setCountry] = useState(profile?.address?.country ?? '');

  useEffect(() => {
    if (!me.data) return;
    setAvatar(me.data.avatarUrl ? [me.data.avatarUrl] : []);
    setFullName(me.data.fullName);
    setOrganization(me.data.organization ?? '');
    setPhone(me.data.phone ?? '');
    setBio(me.data.bio ?? '');
    setLine1(me.data.address?.line1 ?? '');
    setCity(me.data.address?.city ?? '');
    setState(me.data.address?.state ?? '');
    setCountry(me.data.address?.country ?? '');
  }, [me.data]);

  const setup = useMutation({
    mutationFn: () => api.post<{ secret: string; otpauthUrl: string }>('/api/auth/mfa/setup'),
    onSuccess: (d) => setSecret(d.secret),
  });
  const enable = useMutation({
    mutationFn: () => api.post('/api/auth/mfa/enable', { code }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }),
  });
  const saveProfile = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.patch('/api/users/me', payload),
    onSuccess: (raw) => {
      setUser(userSchema.parse(raw));
      qc.invalidateQueries({ queryKey: keys.me });
    },
  });

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-headline-lg mb-1">Account</h1>
        <p className="text-body-md text-on-surface-variant">Profile details, photo, and optional authenticator MFA.</p>
        {user?.id && (
          <p className="text-body-sm mt-2">
            Public profile: <Link className="text-primary" href={`/users/${user.id}`}>View as others see it</Link>
          </p>
        )}
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-headline-md">Profile photo</h2>
        <ImageUploader
          urls={avatar}
          onChange={(urls) => {
            const next = urls.slice(-1);
            setAvatar(next);
            saveProfile.mutate({ avatarUrl: next[0] ?? null });
          }}
          label="Upload a photo or paste a URL"
          max={1}
          accept="image/*"
        />
      </div>

      <form
        className="card p-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          saveProfile.mutate({
            fullName,
            organization: organization || null,
            phone: phone || null,
            bio: bio || null,
            address: line1 && city && state && country ? { line1, city, state, country } : undefined,
          });
        }}
      >
        <h2 className="text-headline-md">Basic info</h2>
        <div>
          <label className="text-label-caps text-outline">Full name</label>
          <input className="input-field" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div>
          <label className="text-label-caps text-outline">Organization</label>
          <input className="input-field" value={organization} onChange={(e) => setOrganization(e.target.value)} />
        </div>
        <div>
          <label className="text-label-caps text-outline">Contact phone</label>
          <input className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="text-label-caps text-outline">Bio</label>
          <textarea className="input-field" rows={4} maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short introduction for buyers and sellers" />
        </div>
        <div>
          <label className="text-label-caps text-outline">Address line</label>
          <input className="input-field" value={line1} onChange={(e) => setLine1(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-label-caps text-outline">City</label>
            <input className="input-field" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <label className="text-label-caps text-outline">State / region</label>
            <input className="input-field" value={state} onChange={(e) => setState(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-label-caps text-outline">Country</label>
          <input className="input-field" value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
        <button className="btn-primary" disabled={saveProfile.isPending}>Save profile</button>
        {saveProfile.isSuccess && <p className="text-success-green text-body-sm">Profile saved.</p>}
        {saveProfile.isError && <p className="text-urgent-red text-body-sm">{(saveProfile.error as Error).message}</p>}
      </form>

      <div className="card p-6 space-y-4">
        <h2 className="text-headline-md">Security</h2>
        <p className="text-body-sm text-on-surface-variant">MFA is currently {user?.mfaEnabled ? 'enabled' : 'off'}.</p>
        <button className="btn-secondary" onClick={() => setup.mutate()} disabled={setup.isPending}>Generate authenticator secret</button>
        {secret && (
          <>
            <p className="font-mono text-body-sm break-all">Secret: {secret}</p>
            <p className="text-body-sm text-on-surface-variant">Add this secret in Google Authenticator or similar, then enter a 6-digit code.</p>
            <input className="input-field" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
            <button className="btn-primary" onClick={() => enable.mutate()} disabled={enable.isPending}>Enable MFA</button>
          </>
        )}
        {enable.isSuccess && <p className="text-success-green text-body-sm">MFA enabled. You will need a code at next login.</p>}
        {enable.isError && <p className="text-urgent-red text-body-sm">{(enable.error as Error).message}</p>}
      </div>
    </div>
  );
}
