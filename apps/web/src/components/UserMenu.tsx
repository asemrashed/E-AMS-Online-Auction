'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, LogOut, User as UserIcon } from 'lucide-react';
import { dashboardHome, useAuthStore } from '@/store/auth';

export function UserMenu() {
  const { user, loading, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const dash = dashboardHome(user?.role);
  const dashLabel = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? 'Admin' : 'Dashboard';

  if (loading) return <div className="w-9 h-9" />;

  if (!user) {
    return (
      <div className="flex items-center gap-3 ml-2">
        <Link href="/login" className="text-body-md text-on-surface-variant hover:text-on-surface">Log in</Link>
        <Link href="/register" className="btn-primary !py-2">Register</Link>
      </div>
    );
  }

  return (
    <div className="relative ml-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="flex items-center gap-2 h-9 px-2 rounded-full text-on-surface-variant hover:bg-surface-container"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <span className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
            <UserIcon className="w-4 h-4" />
          </span>
        )}
        <span className="text-body-sm hidden sm:inline">{user.fullName.split(' ')[0]}</span>
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" aria-label="Close account menu" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-50 card p-1 min-w-[11rem]">
            <Link
              href={dash}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded text-body-sm hover:bg-surface-container"
            >
              <LayoutDashboard className="w-4 h-4" />
              {dashLabel}
            </Link>
            {user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && (
              <Link
                href={`/users/${user.id}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded text-body-sm hover:bg-surface-container"
              >
                <UserIcon className="w-4 h-4" />
                Profile
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-body-sm hover:bg-surface-container text-left"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
