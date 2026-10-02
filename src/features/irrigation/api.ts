import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';

import { http } from '@/lib/api/client';
import { farmOps, useInvalidateFarmOps } from '@/lib/api/farmScope';

import type {
  CompleteIrrigationInput,
  EventQuery,
  FieldStatus,
  IrrigationEvent,
  LogIrrigationInput,
  ObservationInput,
  SetupInput,
  SoilObservation,
  WaterBalance,
} from './types';

export const irrigationKeys = {
  root: (farmId: string) => [...farmOps(farmId), 'irrigation'] as const,
  status: (farmId: string) => [...irrigationKeys.root(farmId), 'status'] as const,
  balance: (farmId: string, fieldId: string, historyDays: number) =>
    [...irrigationKeys.root(farmId), 'balance', fieldId, historyDays] as const,
  events: (farmId: string, query: EventQuery) =>
    [...irrigationKeys.root(farmId), 'events', query] as const,
  observations: (farmId: string, fieldId: string) =>
    [...irrigationKeys.root(farmId), 'observations', fieldId] as const,
};

const base = (farmId: string) => `/farms/${farmId}`;

export const irrigationApi = {
  status: (farmId: string) => http.get<FieldStatus[]>(`${base(farmId)}/irrigation/status`),
  waterBalance: (farmId: string, fieldId: string, historyDays: number) =>
    http.get<WaterBalance>(`${base(farmId)}/fields/${fieldId}/water-balance`, {
      params: { historyDays },
    }),
  configure: (farmId: string, fieldId: string, input: SetupInput) =>
    http.put(`${base(farmId)}/fields/${fieldId}/irrigation-setup`, input),
  events: (farmId: string, query: EventQuery) =>
    http.get<IrrigationEvent[]>(`${base(farmId)}/irrigation/events`, { params: query }),
  log: (farmId: string, fieldId: string, input: LogIrrigationInput) =>
    http.post<IrrigationEvent>(`${base(farmId)}/fields/${fieldId}/irrigation/events`, input),
  planRecommended: (farmId: string, fieldId: string) =>
    http.post<IrrigationEvent>(`${base(farmId)}/fields/${fieldId}/irrigation/plan-recommended`),
  complete: (farmId: string, eventId: string, input: CompleteIrrigationInput) =>
    http.post<IrrigationEvent>(`${base(farmId)}/irrigation/events/${eventId}/complete`, input),
  skip: (farmId: string, eventId: string, reason: string | null) =>
    http.post<IrrigationEvent>(`${base(farmId)}/irrigation/events/${eventId}/skip`, { reason }),
  remove: (farmId: string, eventId: string) =>
    http.delete(`${base(farmId)}/irrigation/events/${eventId}`),
  observations: (farmId: string, fieldId: string) =>
    http.get<SoilObservation[]>(`${base(farmId)}/fields/${fieldId}/soil-observations`),
  observe: (farmId: string, fieldId: string, input: ObservationInput) =>
    http.post<SoilObservation>(`${base(farmId)}/fields/${fieldId}/soil-observations`, input),
};

export function useIrrigationStatus(farmId: string | undefined) {
  return useQuery({
    queryKey: irrigationKeys.status(farmId ?? ''),
    queryFn: () => irrigationApi.status(farmId ?? ''),
    enabled: Boolean(farmId),
  });
}

export function useWaterBalance(farmId: string, fieldId: string, historyDays: number) {
  return useQuery({
    queryKey: irrigationKeys.balance(farmId, fieldId, historyDays),
    queryFn: () => irrigationApi.waterBalance(farmId, fieldId, historyDays),
    placeholderData: keepPreviousData,
  });
}

export function useIrrigationEvents(farmId: string | undefined, query: EventQuery) {
  return useQuery({
    queryKey: irrigationKeys.events(farmId ?? '', query),
    queryFn: () => irrigationApi.events(farmId ?? '', query),
    enabled: Boolean(farmId),
    placeholderData: keepPreviousData,
  });
}

export function useSoilObservations(farmId: string, fieldId: string) {
  return useQuery({
    queryKey: irrigationKeys.observations(farmId, fieldId),
    queryFn: () => irrigationApi.observations(farmId, fieldId),
  });
}

/** Every irrigation write moves the water balance, water accounting, alerts and dashboard. */
function useFarmMutation<TVariables, TResult>(
  farmId: string,
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const invalidate = useInvalidateFarmOps();
  return useMutation({ mutationFn, onSuccess: () => invalidate(farmId) });
}

export function useConfigureIrrigation(farmId: string, fieldId: string) {
  return useFarmMutation(farmId, (input: SetupInput) =>
    irrigationApi.configure(farmId, fieldId, input),
  );
}

export function useLogIrrigation(farmId: string) {
  return useFarmMutation(
    farmId,
    ({ fieldId, input }: { fieldId: string; input: LogIrrigationInput }) =>
      irrigationApi.log(farmId, fieldId, input),
  );
}

export function usePlanRecommended(farmId: string) {
  return useFarmMutation(farmId, (fieldId: string) =>
    irrigationApi.planRecommended(farmId, fieldId),
  );
}

export function useCompleteIrrigation(farmId: string) {
  return useFarmMutation(
    farmId,
    ({ eventId, input }: { eventId: string; input: CompleteIrrigationInput }) =>
      irrigationApi.complete(farmId, eventId, input),
  );
}

export function useSkipIrrigation(farmId: string) {
  return useFarmMutation(
    farmId,
    ({ eventId, reason }: { eventId: string; reason: string | null }) =>
      irrigationApi.skip(farmId, eventId, reason),
  );
}

export function useDeleteIrrigation(farmId: string) {
  return useFarmMutation(farmId, (eventId: string) => irrigationApi.remove(farmId, eventId));
}

export function useRecordObservation(farmId: string) {
  return useFarmMutation(
    farmId,
    ({ fieldId, input }: { fieldId: string; input: ObservationInput }) =>
      irrigationApi.observe(farmId, fieldId, input),
  );
}
