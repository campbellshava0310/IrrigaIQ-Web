import { useMutation, useQuery } from '@tanstack/react-query';

import { http } from '@/lib/api/client';
import { farmOps, useInvalidateFarmOps } from '@/lib/api/farmScope';

import type {
  Asset,
  AssetDetail,
  AssetInput,
  AssetStatus,
  ConditionCheck,
  ConditionCheckInput,
} from './types';

export const assetKeys = {
  root: (farmId: string) => [...farmOps(farmId), 'assets'] as const,
  list: (farmId: string) => [...assetKeys.root(farmId), 'list'] as const,
  detail: (farmId: string, assetId: string) =>
    [...assetKeys.root(farmId), 'detail', assetId] as const,
  checks: (farmId: string, assetId: string, limit: number) =>
    [...assetKeys.root(farmId), 'checks', assetId, limit] as const,
};

const base = (farmId: string) => `/farms/${farmId}/assets`;

export const assetsApi = {
  list: (farmId: string) => http.get<Asset[]>(base(farmId)),
  get: (farmId: string, assetId: string) => http.get<AssetDetail>(`${base(farmId)}/${assetId}`),
  create: (farmId: string, input: AssetInput) => http.post<Asset>(base(farmId), input),
  update: (farmId: string, assetId: string, input: AssetInput) =>
    http.put<Asset>(`${base(farmId)}/${assetId}`, input),
  changeStatus: (farmId: string, assetId: string, status: AssetStatus) =>
    http.patch<Asset>(`${base(farmId)}/${assetId}/status`, { status }),
  remove: (farmId: string, assetId: string) => http.delete(`${base(farmId)}/${assetId}`),
  checks: (farmId: string, assetId: string, limit: number) =>
    http.get<ConditionCheck[]>(`${base(farmId)}/${assetId}/condition-checks`, {
      params: { limit },
    }),
  recordCheck: (farmId: string, assetId: string, input: ConditionCheckInput) =>
    http.post<ConditionCheck>(`${base(farmId)}/${assetId}/condition-checks`, input),
};

export function useAssets(farmId: string | undefined) {
  return useQuery({
    queryKey: assetKeys.list(farmId ?? ''),
    queryFn: () => assetsApi.list(farmId ?? ''),
    enabled: Boolean(farmId),
  });
}

export function useAsset(farmId: string, assetId: string) {
  return useQuery({
    queryKey: assetKeys.detail(farmId, assetId),
    queryFn: () => assetsApi.get(farmId, assetId),
  });
}

export function useConditionChecks(farmId: string, assetId: string, limit = 120) {
  return useQuery({
    queryKey: assetKeys.checks(farmId, assetId, limit),
    queryFn: () => assetsApi.checks(farmId, assetId, limit),
  });
}

export function useSaveAsset(farmId: string, assetId?: string) {
  const invalidate = useInvalidateFarmOps();
  return useMutation({
    mutationFn: (input: AssetInput) =>
      assetId ? assetsApi.update(farmId, assetId, input) : assetsApi.create(farmId, input),
    onSuccess: () => invalidate(farmId),
  });
}

export function useChangeAssetStatus(farmId: string) {
  const invalidate = useInvalidateFarmOps();
  return useMutation({
    mutationFn: ({ assetId, status }: { assetId: string; status: AssetStatus }) =>
      assetsApi.changeStatus(farmId, assetId, status),
    onSuccess: () => invalidate(farmId),
  });
}

export function useDeleteAsset(farmId: string) {
  const invalidate = useInvalidateFarmOps();
  return useMutation({
    mutationFn: (assetId: string) => assetsApi.remove(farmId, assetId),
    onSuccess: () => invalidate(farmId),
  });
}

export function useRecordCheck(farmId: string, assetId: string) {
  const invalidate = useInvalidateFarmOps();
  return useMutation({
    mutationFn: (input: ConditionCheckInput) => assetsApi.recordCheck(farmId, assetId, input),
    onSuccess: () => invalidate(farmId),
  });
}
