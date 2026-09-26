import { useMutation, useQuery } from '@tanstack/react-query';

import { http } from '@/lib/api/client';
import { farmOps, useInvalidateFarmOps } from '@/lib/api/farmScope';

import type { WorkOrder, WorkOrderCompletion, WorkOrderInput } from './types';

export const workOrderKeys = {
  list: (farmId: string) => [...farmOps(farmId), 'work-orders'] as const,
};

const base = (farmId: string) => `/farms/${farmId}/work-orders`;

export const workOrdersApi = {
  list: (farmId: string) => http.get<WorkOrder[]>(base(farmId)),
  create: (farmId: string, input: WorkOrderInput) => http.post<WorkOrder>(base(farmId), input),
  update: (farmId: string, id: string, input: WorkOrderInput) =>
    http.put<WorkOrder>(`${base(farmId)}/${id}`, input),
  start: (farmId: string, id: string) => http.post<WorkOrder>(`${base(farmId)}/${id}/start`),
  complete: (farmId: string, id: string, input: WorkOrderCompletion) =>
    http.post<WorkOrder>(`${base(farmId)}/${id}/complete`, input),
  cancel: (farmId: string, id: string, reason: string | null) =>
    http.post<WorkOrder>(`${base(farmId)}/${id}/cancel`, { reason }),
  reopen: (farmId: string, id: string) => http.post<WorkOrder>(`${base(farmId)}/${id}/reopen`),
};

export function useWorkOrders(farmId: string | undefined) {
  return useQuery({
    queryKey: workOrderKeys.list(farmId ?? ''),
    queryFn: () => workOrdersApi.list(farmId ?? ''),
    enabled: Boolean(farmId),
  });
}

export function useSaveWorkOrder(farmId: string, workOrderId?: string) {
  const invalidate = useInvalidateFarmOps();
  return useMutation({
    mutationFn: (input: WorkOrderInput) =>
      workOrderId
        ? workOrdersApi.update(farmId, workOrderId, input)
        : workOrdersApi.create(farmId, input),
    onSuccess: () => invalidate(farmId),
  });
}

type Transition =
  | { action: 'start'; id: string }
  | { action: 'reopen'; id: string }
  | { action: 'cancel'; id: string; reason: string | null }
  | { action: 'complete'; id: string; completion: WorkOrderCompletion };

/** Lifecycle moves (start, complete, cancel, reopen); completing can reset an asset's service clock. */
export function useWorkOrderTransition(farmId: string) {
  const invalidate = useInvalidateFarmOps();
  return useMutation({
    mutationFn: (transition: Transition) => {
      switch (transition.action) {
        case 'start':
          return workOrdersApi.start(farmId, transition.id);
        case 'reopen':
          return workOrdersApi.reopen(farmId, transition.id);
        case 'cancel':
          return workOrdersApi.cancel(farmId, transition.id, transition.reason);
        case 'complete':
          return workOrdersApi.complete(farmId, transition.id, transition.completion);
      }
    },
    onSuccess: () => invalidate(farmId),
  });
}
