'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { keys } from '@/hooks/useApi';
import { useAuthStore } from '@/store/auth';
import { useState } from 'react';

interface AdminAccount {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
}

export default function ManageAdminsPage() {
  const user = useAuthStore((s) => s.user);
  const { data: admins = [] } = useQuery({
    queryKey: keys.admins,
    enabled: user?.role === 'SUPER_ADMIN',
    queryFn: () => api.get<AdminAccount[]>('/api/super-admin/admins'),
  });
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: () => api.post<AdminAccount>('/api/super-admin/admins', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.admins });
      setForm({ email: '', password: '', fullName: '' });
    },
  });
  const deactivate = useMutation({
    mutationFn: (id: string) => api.patch(`/api/super-admin/admins/${id}/deactivate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.admins }),
  });

  if (user && user.role !== 'SUPER_ADMIN') return <p>Super Admin only.</p>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <h1 className="text-headline-lg mb-6">Admin accounts</h1>
        <div className="card divide-y divide-border-muted">
          {admins.map((a) => (
            <div key={a.id} className="p-5 flex justify-between">
              <div>
                <p className="font-medium">{a.fullName}</p>
                <p className="text-body-sm text-on-surface-variant">{a.email}</p>
              </div>
              {a.isActive ? (
                <button className="btn-secondary text-body-sm" onClick={() => deactivate.mutate(a.id)}>Deactivate</button>
              ) : (
                <span className="text-urgent-red text-body-sm">Deactivated</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <form className="card p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
        <h2 className="text-headline-md">Create admin</h2>
        <input className="input-field" placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <input className="input-field" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input-field" placeholder="Temporary password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {create.isError && <p className="text-urgent-red text-body-sm">{(create.error as Error).message}</p>}
        <button className="btn-primary w-full" disabled={create.isPending}>Create</button>
      </form>
    </div>
  );
}