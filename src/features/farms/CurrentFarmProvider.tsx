import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { useFarms } from './api';
import {
  CurrentFarmContext,
  readStoredFarmId,
  storeFarmId,
  type CurrentFarmValue,
} from './currentFarm';

/**
 * The farm the operations screens (overview, irrigation, water, infrastructure, maintenance,
 * alerts) work on. The choice is remembered per browser; detail routes that carry a farm id in
 * the URL switch the selection to match (see useSyncCurrentFarm).
 */
export function CurrentFarmProvider({ children }: { children: ReactNode }) {
  const farms = useFarms({ page: 0, size: 100 });
  const [selectedId, setSelectedId] = useState<string | null>(readStoredFarmId);

  const select = useCallback((farmId: string) => {
    setSelectedId(farmId);
    storeFarmId(farmId);
  }, []);

  const { data, isPending, error, refetch } = farms;
  const value = useMemo<CurrentFarmValue>(() => {
    const list = data?.content ?? [];
    return {
      farm: list.find((farm) => farm.id === selectedId) ?? list[0],
      farms: list,
      isPending,
      error,
      refetch: () => void refetch(),
      select,
    };
  }, [data, isPending, error, refetch, selectedId, select]);

  return <CurrentFarmContext.Provider value={value}>{children}</CurrentFarmContext.Provider>;
}
