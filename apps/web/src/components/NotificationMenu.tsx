'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { keys, useNotificationsQuery } from '@/hooks/useApi';
import { notificationHref } from '@/lib/notification-link';
import { useAuthStore } from '@/store/auth';
import type { Notification } from '@/lib/schemas';

export function NotificationMenu() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const { data: notifications = [] } = useNotificationsQuery(!!user);
  const qc = useQueryClient();
  const read = useMutation({
    mutationFn: (id: string) => api.patch(`/api/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.notifications }),
  });

  if (!user) return null;

  const latest = notifications.slice(0, 8);
  const unread = notifications.filter((n) => !n.read).length;

  function openItem(n: Notification) {
    if (!n.read) read.mutate(n.id);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-urgent-red" />}
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" aria-label="Close notifications" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-50 card w-[22rem] max-w-[calc(100vw-2rem)] p-0 overflow-hidden">
            <p className="px-4 py-3 text-body-sm font-medium border-b border-border-muted">Notifications</p>
            <div className="max-h-80 overflow-y-auto">
              {latest.length === 0 ? (
                <p className="px-4 py-6 text-body-sm text-on-surface-variant">No notifications yet.</p>
              ) : (
                latest.map((n) => {
                  const href = notificationHref(n);
                  return (
                    <div key={n.id} className={`px-4 py-3 border-b border-border-muted ${n.read ? '' : 'bg-primary/5'}`}>
                      <p className="text-body-sm font-medium">{n.title}</p>
                      <p className="text-body-sm text-on-surface-variant mt-0.5 line-clamp-2">{n.body}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-outline text-xs">{new Date(n.createdAt).toLocaleString()}</span>
                        {href && (
                          <Link href={href} onClick={() => openItem(n)} className="text-primary text-body-sm font-medium">
                            View
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center px-4 py-3 text-body-sm text-primary font-medium hover:bg-surface-container"
            >
              View all notifications
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
