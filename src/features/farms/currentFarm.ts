import { createContext, useContext, useEffect } from 'react';

import type { Farm } from './types';

const STORAGE_KEY = 'irrigaiq.currentFarmId';

export function readStoredFarmId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage blocked (private mode, policy): fall back to the first farm
  }
}

export function storeFarmId(farmId: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, farmId);
  } catch {
    // a remembered selection is a convenience only
  }
}

export interface CurrentFarmValue {
  /** The farm every operations screen is scoped to; undefined while loading or when none exist. */
  farm: Farm | undefined;
  farms: Farm[];
  isPending: boolean;
  error: unknown;
  refetch: () => void;
  select: (farmId: string) => void;
}

export const CurrentFarmContext = createContext<CurrentFarmValue | null>(null);

export function useCurrentFarm(): CurrentFarmValue {
  const value = useContext(CurrentFarmContext);
  if (!value) {
    throw new Error('useCurrentFarm must be used inside CurrentFarmProvider');
  }
  return value;
}

/** Makes a deep link to another farm's page switch the farm selector to that farm. */
export function useSyncCurrentFarm(farmId: string | undefined) {
  const { farm, farms, select } = useCurrentFarm();
  useEffect(() => {
    if (farmId && farm?.id !== farmId && farms.some((candidate) => candidate.id === farmId)) {
      select(farmId);
    }
  }, [farmId, farm?.id, farms, select]);
}
