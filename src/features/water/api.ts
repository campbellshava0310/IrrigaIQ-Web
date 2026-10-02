import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { http } from '@/lib/api/client';
import { farmOps } from '@/lib/api/farmScope';

import type { WaterSummary } from './types';

export const waterKeys = {
  summary: (farmId: string, from: string, to: string) =>
    [...farmOps(farmId), 'water', { from, to }] as const,
};

export function useWaterSummary(farmId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: waterKeys.summary(farmId ?? '', from, to),
    queryFn: () =>
      http.get<WaterSummary>(`/farms/${farmId}/water/summary`, { params: { from, to } }),
    enabled: Boolean(farmId),
    placeholderData: keepPreviousData,
  });
}
