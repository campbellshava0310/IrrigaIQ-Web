import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { farmKeys } from '@/features/farms/api';
import { http } from '@/lib/api/client';
import type { Page } from '@/lib/api/types';
import type { Role } from '@/lib/auth/types';

import type {
  AdminOverview,
  AdminUser,
  AuditAction,
  AuditEvent,
  CreateUserInput,
  DemoFarmResult,
  Health,
  UpdateUserInput,
} from './types';

export interface UserSearch {
  q?: string;
  role?: Role | null;
  enabled?: boolean | null;
  page: number;
}

export interface AuditSearch {
  action?: AuditAction | null;
  outcome?: 'SUCCESS' | 'FAILURE' | null;
  page: number;
}

export const adminKeys = {
  all: ['admin'] as const,
  overview: () => [...adminKeys.all, 'overview'] as const,
  health: () => [...adminKeys.all, 'health'] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  userList: (search: UserSearch) => [...adminKeys.users(), 'list', search] as const,
  audit: (search: AuditSearch) => [...adminKeys.all, 'audit', search] as const,
};

export function useAdminOverview() {
  return useQuery({
    queryKey: adminKeys.overview(),
    queryFn: () => http.get<AdminOverview>('/admin/overview'),
  });
}

/**
 * Actuator health with component details (visible to administrators only). A DOWN system answers
 * 503 with the same body, which is data here, not a request failure.
 */
export function useSystemHealth() {
  return useQuery({
    queryKey: adminKeys.health(),
    queryFn: async () => {
      const health = await http.get<Health>('/actuator/health', {
        baseURL: '/',
        validateStatus: (status) => status === 200 || status === 503,
      });
      if (typeof health !== 'object' || health === null || typeof health.status !== 'string') {
        throw new Error('The health endpoint returned an unexpected response');
      }
      return health;
    },
    refetchInterval: 30_000,
  });
}

export function useAdminUsers(search: UserSearch) {
  return useQuery({
    queryKey: adminKeys.userList(search),
    queryFn: () =>
      http.get<Page<AdminUser>>('/admin/users', {
        params: {
          q: search.q || undefined,
          role: search.role ?? undefined,
          enabled: search.enabled ?? undefined,
          page: search.page,
          size: 20,
        },
      }),
    placeholderData: keepPreviousData,
  });
}

function useUserMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.users() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.overview() }),
      ]),
  });
}

export const useCreateUser = () =>
  useUserMutation((input: CreateUserInput) => http.post<AdminUser>('/admin/users', input));

export const useUpdateUser = () =>
  useUserMutation(({ id, input }: { id: string; input: UpdateUserInput }) =>
    http.patch<AdminUser>(`/admin/users/${id}`, input),
  );

export const useUnlockUser = () =>
  useUserMutation((id: string) => http.post<AdminUser>(`/admin/users/${id}/unlock`));

export const useRevokeUserSessions = () =>
  useUserMutation((id: string) => http.delete(`/admin/users/${id}/sessions`));

export function useAuditEvents(search: AuditSearch) {
  return useQuery({
    queryKey: adminKeys.audit(search),
    queryFn: () =>
      http.get<Page<AuditEvent>>('/admin/audit-events', {
        params: {
          action: search.action ?? undefined,
          outcome: search.outcome ?? undefined,
          page: search.page,
          size: 50,
        },
      }),
    placeholderData: keepPreviousData,
  });
}

/** Seeds a realistic farm (fields, crops, irrigation history, infrastructure, work orders). */
export function useCreateDemoFarm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ownerEmail: string | null) =>
      http.post<DemoFarmResult>('/admin/demo-farm', ownerEmail ? { ownerEmail } : {}),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: farmKeys.all }),
        queryClient.invalidateQueries({ queryKey: adminKeys.overview() }),
      ]),
  });
}
