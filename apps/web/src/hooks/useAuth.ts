'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { userSchema, type User } from '@/lib/schemas';
import { useAuthStore } from '@/store/auth';

export function useLogin() {
  const completeLogin = useAuthStore((s) => s.completeLogin);
  return useMutation({
    mutationFn: async (body: { email: string; password: string }) => {
      const res = await api.post<{
        mfaRequired?: boolean;
        userId?: string;
        emailVerificationRequired?: boolean;
        email?: string;
        user?: User;
        accessToken?: string;
        refreshToken?: string;
      }>('/api/auth/login', body, false);
      if (res.mfaRequired || res.emailVerificationRequired) return res;
      completeLogin(userSchema.parse(res.user), res.accessToken!, res.refreshToken!);
      return res;
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      return api.post<{ emailVerificationRequired?: boolean; email?: string; message?: string }>('/api/auth/register', body, false);
    },
  });
}

export function useMfaVerify() {
  const completeLogin = useAuthStore((s) => s.completeLogin);
  return useMutation({
    mutationFn: async (body: { userId: string; code: string }) => {
      const res = await api.post<{ user: User; accessToken: string; refreshToken: string }>('/api/auth/mfa/verify', body, false);
      completeLogin(userSchema.parse(res.user), res.accessToken, res.refreshToken);
      return res;
    },
  });
}