import {
  IconActivity,
  IconCloudRain,
  IconDroplet,
  IconPlant2,
  type Icon,
} from '@tabler/icons-react';

import { formatNumber } from '@/lib/format';

import type { Device, SensorType } from './types';

export const SENSOR_TYPE: Record<SensorType, { label: string; icon: Icon; placement: string }> = {
  SOIL_MOISTURE: {
    label: 'Soil moisture probe',
    icon: IconPlant2,
    placement: 'In a field, in the crop’s root zone',
  },
  FLOW_METER: {
    label: 'Water meter',
    icon: IconDroplet,
    placement: 'On a pump or mainline (or a field’s supply)',
  },
  PUMP_MONITOR: {
    label: 'Pump monitor',
    icon: IconActivity,
    placement: 'On a pump: power, flow, pressure, vibration, motor temperature',
  },
  WEATHER_STATION: {
    label: 'Weather station',
    icon: IconCloudRain,
    placement: 'Anywhere on the farm',
  },
};

export function deviceState(device: Device): { label: string; color: string } {
  if (device.status === 'DISABLED') return { label: 'Disabled', color: 'gray' };
  if (!device.lastSeenAt) return { label: 'Waiting for data', color: 'gray' };
  return device.online
    ? { label: 'Online', color: 'green' }
    : { label: 'Offline', color: 'yellow' };
}

/** The reading that matters for the device's type, e.g. "23.0% · 68% depleted" or "500 L/h". */
export function latestSummary(device: Device): string {
  const reading = device.latest;
  if (!reading) return '—';
  switch (device.type) {
    case 'SOIL_MOISTURE':
      return reading.soilMoisturePct == null
        ? '—'
        : `${formatNumber(reading.soilMoisturePct, 1)}%${
            device.depletionPct != null ? ` · ${formatNumber(device.depletionPct)}% depleted` : ''
          }`;
    case 'FLOW_METER':
      return reading.flowLpm != null
        ? `${formatNumber(reading.flowLpm * 60)} L/h`
        : reading.volumeLitres != null
          ? `${formatNumber(reading.volumeLitres, 1)} L`
          : '—';
    case 'PUMP_MONITOR':
      return (
        [
          reading.powerKw != null ? `${formatNumber(reading.powerKw, 1)} kW` : null,
          reading.vibrationMmS != null ? `${formatNumber(reading.vibrationMmS, 1)} mm/s` : null,
          reading.motorTempC != null ? `${formatNumber(reading.motorTempC)} °C` : null,
        ]
          .filter(Boolean)
          .join(' · ') || '—'
      );
    default:
      return reading.temperatureC != null ? `${formatNumber(reading.temperatureC, 1)} °C` : '—';
  }
}
