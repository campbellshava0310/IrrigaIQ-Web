import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * Root query key for everything computed from a farm's operations (irrigation, water, assets,
 * work orders, alerts, dashboard). One change on a farm ripples through most of these views
 * (an irrigation moves the water balance, the alerts and the dashboard), so mutations
 * invalidate the whole scope rather than guessing which projections moved.
 */
export const farmOps = (farmId: string) => ['farm-ops', farmId] as const;

export function useInvalidateFarmOps() {
  const queryClient = useQueryClient();
  return useCallback(
    (farmId: string) => queryClient.invalidateQueries({ queryKey: farmOps(farmId) }),
    [queryClient],
  );
}
