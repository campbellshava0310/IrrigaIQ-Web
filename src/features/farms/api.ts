import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { http } from '@/lib/api/client';
import { farmOps } from '@/lib/api/farmScope';
import type { Page } from '@/lib/api/types';

import type { Crop, CropInput, Farm, FarmInput, Field, FieldInput } from './types';

export interface FarmListParams {
  q?: string;
  page?: number;
  size?: number;
}

/** Hierarchical keys: invalidating a farm also invalidates its fields and crops. */
export const farmKeys = {
  all: ['farms'] as const,
  lists: () => [...farmKeys.all, 'list'] as const,
  list: (params: FarmListParams) => [...farmKeys.lists(), params] as const,
  detail: (farmId: string) => [...farmKeys.all, 'detail', farmId] as const,
  fields: (farmId: string) => [...farmKeys.detail(farmId), 'fields'] as const,
  field: (farmId: string, fieldId: string) => [...farmKeys.fields(farmId), fieldId] as const,
  crops: (farmId: string, fieldId: string) =>
    [...farmKeys.field(farmId, fieldId), 'crops'] as const,
};

const farmPath = (farmId: string) => `/farms/${farmId}`;
const fieldPath = (farmId: string, fieldId: string) => `${farmPath(farmId)}/fields/${fieldId}`;

export const farmsApi = {
  list: ({ q, page = 0, size = 20 }: FarmListParams) =>
    http.get<Page<Farm>>('/farms', { params: { q: q || undefined, page, size } }),
  get: (farmId: string) => http.get<Farm>(farmPath(farmId)),
  create: (input: FarmInput) => http.post<Farm>('/farms', input),
  update: (farmId: string, input: FarmInput) => http.put<Farm>(farmPath(farmId), input),
  remove: (farmId: string) => http.delete(farmPath(farmId)),

  listFields: (farmId: string) => http.get<Field[]>(`${farmPath(farmId)}/fields`),
  getField: (farmId: string, fieldId: string) => http.get<Field>(fieldPath(farmId, fieldId)),
  createField: (farmId: string, input: FieldInput) =>
    http.post<Field>(`${farmPath(farmId)}/fields`, input),
  updateField: (farmId: string, fieldId: string, input: FieldInput) =>
    http.put<Field>(fieldPath(farmId, fieldId), input),
  removeField: (farmId: string, fieldId: string) => http.delete(fieldPath(farmId, fieldId)),

  listCrops: (farmId: string, fieldId: string) =>
    http.get<Crop[]>(`${fieldPath(farmId, fieldId)}/crops`),
  createCrop: (farmId: string, fieldId: string, input: CropInput) =>
    http.post<Crop>(`${fieldPath(farmId, fieldId)}/crops`, input),
  updateCrop: (farmId: string, fieldId: string, cropId: string, input: CropInput) =>
    http.put<Crop>(`${fieldPath(farmId, fieldId)}/crops/${cropId}`, input),
  removeCrop: (farmId: string, fieldId: string, cropId: string) =>
    http.delete(`${fieldPath(farmId, fieldId)}/crops/${cropId}`),
};

// ---- Farms ----

export function useFarms(params: FarmListParams) {
  return useQuery({
    queryKey: farmKeys.list(params),
    queryFn: () => farmsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useFarm(farmId: string) {
  return useQuery({ queryKey: farmKeys.detail(farmId), queryFn: () => farmsApi.get(farmId) });
}

export function useSaveFarm(farmId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FarmInput) =>
      farmId ? farmsApi.update(farmId, input) : farmsApi.create(input),
    onSuccess: (farm) => {
      queryClient.setQueryData(farmKeys.detail(farm.id), farm);
      // Location, tariff and baseline feed the weather, energy cost and savings projections.
      void queryClient.invalidateQueries({ queryKey: farmOps(farm.id) });
      return queryClient.invalidateQueries({ queryKey: farmKeys.lists() });
    },
  });
}

export function useDeleteFarm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (farmId: string) => farmsApi.remove(farmId),
    onSuccess: (_, farmId) => {
      queryClient.removeQueries({ queryKey: farmKeys.detail(farmId) });
      queryClient.removeQueries({ queryKey: farmOps(farmId) });
      return queryClient.invalidateQueries({ queryKey: farmKeys.lists() });
    },
  });
}

// ---- Fields ----

export function useFields(farmId: string) {
  return useQuery({
    queryKey: farmKeys.fields(farmId),
    queryFn: () => farmsApi.listFields(farmId),
  });
}

export function useField(farmId: string, fieldId: string) {
  return useQuery({
    queryKey: farmKeys.field(farmId, fieldId),
    queryFn: () => farmsApi.getField(farmId, fieldId),
  });
}

export function useSaveField(farmId: string, fieldId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FieldInput) =>
      fieldId ? farmsApi.updateField(farmId, fieldId, input) : farmsApi.createField(farmId, input),
    // Field counts on the farm and farm lists change too, and so does the water balance.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: farmKeys.all }),
        queryClient.invalidateQueries({ queryKey: farmOps(farmId) }),
      ]),
  });
}

export function useDeleteField(farmId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fieldId: string) => farmsApi.removeField(farmId, fieldId),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: farmKeys.all }),
        queryClient.invalidateQueries({ queryKey: farmOps(farmId) }),
      ]),
  });
}

// ---- Crops ----

export function useCrops(farmId: string, fieldId: string) {
  return useQuery({
    queryKey: farmKeys.crops(farmId, fieldId),
    queryFn: () => farmsApi.listCrops(farmId, fieldId),
  });
}

export function useSaveCrop(farmId: string, fieldId: string, cropId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CropInput) =>
      cropId
        ? farmsApi.updateCrop(farmId, fieldId, cropId, input)
        : farmsApi.createCrop(farmId, fieldId, input),
    // The crop drives Kc, rooting depth and the season: recommendations change with it.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: farmKeys.crops(farmId, fieldId) }),
        queryClient.invalidateQueries({ queryKey: farmOps(farmId) }),
      ]),
  });
}

export function useDeleteCrop(farmId: string, fieldId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cropId: string) => farmsApi.removeCrop(farmId, fieldId, cropId),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: farmKeys.crops(farmId, fieldId) }),
        queryClient.invalidateQueries({ queryKey: farmOps(farmId) }),
      ]),
  });
}
