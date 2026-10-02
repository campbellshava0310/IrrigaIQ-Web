import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { http } from '@/lib/api/client';
import { farmOps, useInvalidateFarmOps } from '@/lib/api/farmScope';

import type { Device, DeviceInput, IssuedKey, ReadingSeries } from './types';

export const deviceKeys = {
  root: (farmId: string) => [...farmOps(farmId), 'devices'] as const,
  list: (farmId: string) => [...deviceKeys.root(farmId), 'list'] as const,
  readings: (farmId: string, deviceId: string, hours: number) =>
    [...deviceKeys.root(farmId), 'readings', deviceId, hours] as const,
};

const base = (farmId: string) => `/farms/${farmId}/devices`;

export const deviceApi = {
  list: (farmId: string) => http.get<Device[]>(base(farmId)),
  register: (farmId: string, input: DeviceInput) => http.post<IssuedKey>(base(farmId), input),
  update: (farmId: string, id: string, input: DeviceInput) =>
    http.put<Device>(`${base(farmId)}/${id}`, input),
  rotateKey: (farmId: string, id: string) =>
    http.post<IssuedKey>(`${base(farmId)}/${id}/rotate-key`),
  remove: (farmId: string, id: string) => http.delete(`${base(farmId)}/${id}`),
  readings: (farmId: string, id: string, hours: number) =>
    http.get<ReadingSeries>(`${base(farmId)}/${id}/readings`, { params: { hours } }),
};

/** Devices refresh every 30 s so "online" and latest readings stay current while watching. */
export function useDevices(farmId: string | undefined) {
  return useQuery({
    queryKey: deviceKeys.list(farmId ?? ''),
    queryFn: () => deviceApi.list(farmId ?? ''),
    enabled: Boolean(farmId),
    refetchInterval: 30_000,
  });
}

export function useDeviceReadings(farmId: string, deviceId: string | null, hours = 48) {
  return useQuery({
    queryKey: deviceKeys.readings(farmId, deviceId ?? '', hours),
    queryFn: () => deviceApi.readings(farmId, deviceId ?? '', hours),
    enabled: Boolean(deviceId),
    refetchInterval: 60_000,
  });
}

export function useRegisterDevice(farmId: string) {
  const invalidate = useInvalidateFarmOps();
  return useMutation({
    mutationFn: (input: DeviceInput) => deviceApi.register(farmId, input),
    onSettled: () => invalidate(farmId),
  });
}

/** Snapshot the list, apply a change at once, and roll back if the server refuses it. */
function useOptimisticList(farmId: string) {
  const queryClient = useQueryClient();
  const key = deviceKeys.list(farmId);
  return {
    async apply(change: (devices: Device[]) => Device[]) {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Device[]>(key);
      if (previous) queryClient.setQueryData<Device[]>(key, change(previous));
      return { previous };
    },
    rollback(context: { previous?: Device[] } | undefined) {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
  };
}

export function useUpdateDevice(farmId: string) {
  const invalidate = useInvalidateFarmOps();
  const list = useOptimisticList(farmId);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DeviceInput }) =>
      deviceApi.update(farmId, id, input),
    onMutate: ({ id, input }) =>
      list.apply((devices) =>
        devices.map((device) =>
          device.id === id && input.status ? { ...device, status: input.status } : device,
        ),
      ),
    onError: (_error, _variables, context) => list.rollback(context),
    onSettled: () => invalidate(farmId),
  });
}

export function useRotateDeviceKey(farmId: string) {
  const invalidate = useInvalidateFarmOps();
  return useMutation({
    mutationFn: (id: string) => deviceApi.rotateKey(farmId, id),
    onSettled: () => invalidate(farmId),
  });
}

export function useDeleteDevice(farmId: string) {
  const invalidate = useInvalidateFarmOps();
  const list = useOptimisticList(farmId);
  return useMutation({
    mutationFn: (id: string) => deviceApi.remove(farmId, id),
    onMutate: (id) => list.apply((devices) => devices.filter((device) => device.id !== id)),
    onError: (_error, _id, context) => list.rollback(context),
    onSettled: () => invalidate(farmId),
  });
}
