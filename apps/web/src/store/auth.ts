'use client';

import { create } from 'zustand';
import type { Role, User } from '@/lib/schemas';
import { clearTokens, setTokens } from '@/lib/api';
import { clearSessionCookies, setSessionCookies } from '@/lib/session-cookies';

interface AuthState {
  user: User | null;
  loading: boolean;
  unreadCount: number;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setUnreadCount: (n: number) => void;
  completeLogin: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  homeForRole: (role?: Role) => string;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  unreadCount: 0,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  completeLogin: (user, accessToken, refreshToken) => {
    setTokens(accessToken, refreshToken);
    setSessionCookies(user.role);
    set({ user, loading: false });
  },
  logout: () => {
    clearTokens();
    clearSessionCookies();
    set({ user: null, unreadCount: 0 });
    window.location.href = '/login';
  },
  homeForRole: (role) => {
    if (role === 'SELLER') return '/dashboard/listings';
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return '/admin';
    return '/dashboard';
  },
}));

export function dashboardHome(role?: Role) {
  if (role === 'SELLER') return '/dashboard/listings';
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return '/admin';
  return '/dashboard';
}