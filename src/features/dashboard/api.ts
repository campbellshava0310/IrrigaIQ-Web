import { useQuery } from '@tanstack/react-query';

import { http } from '@/lib/api/client';
import { farmOps } from '@/lib/api/farmScope';

import type { Briefing, Dashboard, WeatherView } from './types';

export const dashboardKeys = {
  dashboard: (farmId: string) => [...farmOps(farmId), 'dashboard'] as const,
  briefing: (farmId: string) => [...farmOps(farmId), 'briefing'] as const,
  weather: (farmId: string, pastDays: number, forecastDays: number) =>
    [...farmOps(farmId), 'weather', { pastDays, forecastDays }] as const,
};

export function useDashboard(farmId: string | undefined) {
  return useQuery({
    queryKey: dashboardKeys.dashboard(farmId ?? ''),
    queryFn: () => http.get<Dashboard>(`/farms/${farmId}/dashboard`),
    enabled: Boolean(farmId),
    refetchInterval: 5 * 60_000,
  });
}

export function useBriefing(farmId: string | undefined) {
  return useQuery({
    queryKey: dashboardKeys.briefing(farmId ?? ''),
    queryFn: () => http.get<Briefing>(`/farms/${farmId}/briefing`),
    enabled: Boolean(farmId),
  });
}

export function useWeather(farmId: string | undefined, pastDays = 7, forecastDays = 7) {
  return useQuery({
    queryKey: dashboardKeys.weather(farmId ?? '', pastDays, forecastDays),
    queryFn: () =>
      http.get<WeatherView>(`/farms/${farmId}/weather`, { params: { pastDays, forecastDays } }),
    enabled: Boolean(farmId),
  });
}
