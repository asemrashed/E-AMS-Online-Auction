'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { keys, useNotificationsQuery } from '@/hooks/useApi';
import { notificationHref } from '@/lib/notification-link';
import { useAuthStore } from '@/store/auth';
import { useState } from 'react';

export default function NotificationsPage() {
  const user = useAuthStore((s) => s.user);
  const { data: notifications = [] } = useNotificationsQuery(!!user);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const qc = useQueryClient();
  const read = useMutation({
    mutationFn: (id: string) => api.patch(`/api/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.notifications }),
  });
  const visible = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  return (
    <main className="max-w-3xl mx-auto px-margin-desktop py-10">
      <div className="flex justify-between mb-6">
        <h1 className="text-headline-lg">Notifications</h1>
        <div className="flex gap-2">
          <button onClick={() => setFilter('all')} className={filter === 'all' ? 'btn-primary text-body-sm' : 'btn-secondary text-body-sm'}>All</button>
          <button onClick={() => setFilter('unread')} className={filter === 'unread' ? 'btn-primary text-body-sm' : 'btn-secondary text-body-sm'}>Unread</button>
        </div>
      </div>
      <div className="space-y-3">
        {visible.length === 0 && <p>No notifications.</p>}
        {visible.map((n) => {
          const href = notificationHref(n);
          return (
            <div key={n.id} className={`card p-4 border-l-4 ${n.read ? 'border-l-border-muted' : 'border-l-primary'}`}>
              <div className="flex justify-between mb-1 gap-4">
                <p className="font-medium">{n.title}</p>
                <span className="text-body-sm text-outline shrink-0">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-body-sm text-on-surface-variant">{n.body}</p>
              <div className="mt-3 flex gap-3">
                {href && (
                  <Link
                    href={href}
                    className="btn-primary !py-2 !px-4 text-body-sm"
                    onClick={() => { if (!n.read) read.mutate(n.id); }}
                  >
                    View
                  </Link>
                )}
                {!n.read && (
                  <button type="button" className="btn-secondary !py-2 !px-4 text-body-sm" onClick={() => read.mutate(n.id)}>
                    Mark read
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
