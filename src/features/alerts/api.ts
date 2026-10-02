import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { http } from '@/lib/api/client';
import { farmOps, useInvalidateFarmOps } from '@/lib/api/farmScope';

import type { Alert, WorkOrderLink } from './types';

export const alertKeys = {
  list: (farmId: string, includeResolved: boolean) =>
    [...farmOps(farmId), 'alerts', { includeResolved }] as const,
};

const base = (farmId: string) => `/farms/${farmId}/alerts`;

export const alertsApi = {
  list: (farmId: string, includeResolved: boolean) =>
    http.get<Alert[]>(base(farmId), { params: { includeResolved } }),
  evaluate: (farmId: string) => http.post(`${base(farmId)}/evaluate`),
  acknowledge: (farmId: string, id: string) =>
    http.post<Alert>(`${base(farmId)}/${id}/acknowledge`),
  resolve: (farmId: string, id: string) => http.post<Alert>(`${base(farmId)}/${id}/resolve`),
  createWorkOrder: (farmId: string, id: string) =>
    http.post<WorkOrderLink>(`${base(farmId)}/${id}/work-order`),
};

export function useAlerts(farmId: string | undefined, includeResolved = false) {
  return useQuery({
    queryKey: alertKeys.list(farmId ?? '', includeResolved),
    queryFn: () => alertsApi.list(farmId ?? '', includeResolved),
    enabled: Boolean(farmId),
    // Alerts also change from the server's scheduled sweep, not only from this client.
    refetchInterval: 60_000,
  });
}

/**
 * Acknowledge or resolve, applied to the cached lists at once (the card updates before the
 * server answers) and rolled back if the request fails.
 */
export function useAlertAction(farmId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateFarmOps();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'acknowledge' | 'resolve' }) =>
      action === 'acknowledge' ? alertsApi.acknowledge(farmId, id) : alertsApi.resolve(farmId, id),
    onMutate: async ({ id, action }) => {
      const keys = [alertKeys.list(farmId, false), alertKeys.list(farmId, true)];
      await Promise.all(keys.map((queryKey) => queryClient.cancelQueries({ queryKey })));
      const snapshots = keys.map(
        (queryKey) => [queryKey, queryClient.getQueryData<Alert[]>(queryKey)] as const,
      );
      const now = new Date().toISOString();
      for (const [queryKey, alerts] of snapshots) {
        if (!alerts) continue;
        const activeOnly = queryKey === keys[0];
        queryClient.setQueryData<Alert[]>(
          queryKey,
          alerts
            .map((alert): Alert =>
              alert.id !== id
                ? alert
                : action === 'acknowledge'
                  ? { ...alert, state: 'ACKNOWLEDGED', updatedAt: now }
                  : { ...alert, state: 'RESOLVED', resolvedAt: now, updatedAt: now },
            )
            .filter((alert) => !(activeOnly && alert.state === 'RESOLVED')),
        );
      }
      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      context?.snapshots.forEach(([queryKey, alerts]) =>
        queryClient.setQueryData(queryKey, alerts),
      );
    },
    onSettled: () => invalidate(farmId),
  });
}

export function useAlertWorkOrder(farmId: string) {
  const invalidate = useInvalidateFarmOps();
  return useMutation({
    mutationFn: (id: string) => alertsApi.createWorkOrder(farmId, id),
    onSuccess: () => invalidate(farmId),
  });
}

export function useEvaluateAlerts(farmId: string) {
  const invalidate = useInvalidateFarmOps();
  return useMutation({
    mutationFn: () => alertsApi.evaluate(farmId),
    onSuccess: () => invalidate(farmId),
  });
}
