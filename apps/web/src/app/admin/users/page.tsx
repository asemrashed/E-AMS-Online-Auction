'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { keys } from '@/hooks/useApi';
import { useAuthStore } from '@/store/auth';
import { useState } from 'react';

interface AdminUser {
  id: string; email: string; fullName: string; role: string; kycStatus: string; isActive: boolean;
  kycDocumentUrls?: string[];
  bankAccount?: { verified: boolean } | null;
}

export default function AdminUsersPage() {
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [docsFor, setDocsFor] = useState<AdminUser | null>(null);
  const { data: users = [] } = useQuery({
    queryKey: keys.adminUsers,
    enabled: !!user,
    queryFn: () => api.get<AdminUser[]>('/api/admin/users'),
  });
  const qc = useQueryClient();
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api.patch(`/api/admin/users/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.adminUsers }),
  });

  const filtered = users.filter((u) => u.fullName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex justify-between mb-6">
        <h1 className="text-headline-lg">Users</h1>
        <input className="input-field w-64" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="text-left text-outline border-b border-border-muted">
              <th className="p-4">User</th><th>Role</th><th>Status</th><th>KYC</th><th>Documents</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-border-muted">
                <td className="p-4"><p className="font-medium">{u.fullName}</p><p className="text-outline">{u.email}</p></td>
                <td>{u.role}</td>
                <td className={u.isActive ? 'text-success-green' : 'text-urgent-red'}>{u.isActive ? 'Active' : 'Suspended'}</td>
                <td>
                  <select value={u.kycStatus} className="input-field !py-1" onChange={(e) => patch.mutate({ id: u.id, body: { kycStatus: e.target.value } })}>
                    <option value="UNVERIFIED">Unverified</option>
                    <option value="PENDING">Pending</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </td>
                <td>
                  {u.kycDocumentUrls?.length ? (
                    <button type="button" className="text-primary" onClick={() => setDocsFor(u)}>
                      View ({u.kycDocumentUrls.length})
                    </button>
                  ) : (
                    <span className="text-outline">None</span>
                  )}
                </td>
                <td>
                  <button className="text-primary" onClick={() => patch.mutate({ id: u.id, body: { isActive: !u.isActive } })}>
                    {u.isActive ? 'Suspend' : 'Reinstate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {docsFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={() => setDocsFor(null)} />
          <div className="relative card p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4 gap-4">
              <div>
                <h2 className="text-headline-md">KYC documents</h2>
                <p className="text-body-sm text-on-surface-variant">{docsFor.fullName} · {docsFor.email}</p>
              </div>
              <button type="button" className="btn-secondary !py-2" onClick={() => setDocsFor(null)}>Close</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {docsFor.kycDocumentUrls?.map((url, i) => {
                const isImage = /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url) || url.includes('image');
                return (
                  <div key={url} className="border border-border-muted rounded-md p-3">
                    <p className="text-body-sm mb-2">Document {i + 1}</p>
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={`KYC document ${i + 1}`} className="w-full max-h-72 object-contain rounded bg-surface-container-low" />
                    ) : (
                      <p className="text-body-sm text-on-surface-variant break-all">{url}</p>
                    )}
                    <a href={url} target="_blank" rel="noreferrer" className="text-primary text-body-sm mt-2 inline-block">
                      Open original
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
