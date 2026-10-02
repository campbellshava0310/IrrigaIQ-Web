import { useQuery } from '@tanstack/react-query';

import { http } from '@/lib/api/client';
import { farmOps } from '@/lib/api/farmScope';

import type {
  EquipmentRiskView,
  IrrigationModelView,
  ModelCatalogue,
  WaterAnomalyView,
} from './types';

export const mlKeys = {
  root: (farmId: string) => [...farmOps(farmId), 'ml'] as const,
  irrigation: (farmId: string) => [...mlKeys.root(farmId), 'irrigation'] as const,
  water: (farmId: string) => [...mlKeys.root(farmId), 'water'] as const,
  equipment: (farmId: string) => [...mlKeys.root(farmId), 'equipment'] as const,
  models: ['ml-models'] as const,
};

const base = (farmId: string) => `/farms/${farmId}/ml`;

export const mlApi = {
  irrigation: (farmId: string) => http.get<IrrigationModelView>(`${base(farmId)}/irrigation`),
  water: (farmId: string) => http.get<WaterAnomalyView>(`${base(farmId)}/water-anomalies`),
  equipment: (farmId: string) => http.get<EquipmentRiskView>(`${base(farmId)}/equipment-risk`),
  models: () => http.get<ModelCatalogue>('/ml/models'),
};

/** The irrigation-need model beside the water balance. Optional: screens work without it. */
export function useIrrigationModel(farmId: string | undefined) {
  return useQuery({
    queryKey: mlKeys.irrigation(farmId ?? ''),
    queryFn: () => mlApi.irrigation(farmId ?? ''),
    enabled: Boolean(farmId),
    staleTime: 60_000,
  });
}

/** Meter anomaly checks refresh every minute: flow can change fast. */
export function useWaterAnomalies(farmId: string | undefined) {
  return useQuery({
    queryKey: mlKeys.water(farmId ?? ''),
    queryFn: () => mlApi.water(farmId ?? ''),
    enabled: Boolean(farmId),
    refetchInterval: 60_000,
  });
}

export function useEquipmentRisk(farmId: string | undefined) {
  return useQuery({
    queryKey: mlKeys.equipment(farmId ?? ''),
    queryFn: () => mlApi.equipment(farmId ?? ''),
    enabled: Boolean(farmId),
    staleTime: 60_000,
  });
}

export function useModelCatalogue() {
  return useQuery({ queryKey: mlKeys.models, queryFn: mlApi.models, staleTime: 10 * 60_000 });
}
