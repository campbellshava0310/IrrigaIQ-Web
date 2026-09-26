import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { http } from '@/lib/api/client';
import { session } from '@/lib/auth/session';
import type { CurrentUser } from '@/lib/auth/types';

export interface Session {
  id: string;
  clientType: 'WEB' | 'MOBILE';
  userAgent: string | null;
  ipAddress: string | null;
  startedAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  current: boolean;
}

export const accountKeys = {
  me: ['account', 'me'] as const,
  sessions: ['account', 'sessions'] as const,
};

export function useProfile() {
  return useQuery({ queryKey: accountKeys.me, queryFn: () => http.get<CurrentUser>('/me') });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { fullName: string }) => http.patch<CurrentUser>('/me', input),
    onSuccess: (user) => {
      queryClient.setQueryData(accountKeys.me, user);
      session.updateUser(user);
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      http.post('/me/password', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.sessions }),
  });
}

export function useSessions() {
  return useQuery({
    queryKey: accountKeys.sessions,
    queryFn: () => http.get<Session[]>('/me/sessions'),
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => http.delete(`/me/sessions/${sessionId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.sessions }),
  });
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => http.delete('/me/sessions'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.sessions }),
  });
}
