import {
  IconAlertOctagon,
  IconAlertTriangle,
  IconInfoCircle,
  type Icon,
} from '@tabler/icons-react';

import type { AlertSeverity, AlertState, AlertType } from './types';

export const SEVERITY: Record<
  AlertSeverity,
  { label: string; color: string; icon: Icon; rank: number }
> = {
  CRITICAL: { label: 'Critical', color: 'red', icon: IconAlertOctagon, rank: 0 },
  WARNING: { label: 'Warning', color: 'orange', icon: IconAlertTriangle, rank: 1 },
  INFO: { label: 'Info', color: 'blue', icon: IconInfoCircle, rank: 2 },
};

export const STATE: Record<AlertState, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: 'red' },
  ACKNOWLEDGED: { label: 'Acknowledged', color: 'yellow' },
  RESOLVED: { label: 'Resolved', color: 'teal' },
};

export const ALERT_TYPE: Record<AlertType, string> = {
  IRRIGATION_REQUIRED: 'Irrigation required',
  CROP_WATER_STRESS: 'Crop water stress',
  RAIN_EXPECTED: 'Heavy rain expected',
  SERVICE_OVERDUE: 'Service overdue',
  ASSET_FAILURE_RISK: 'Failure risk',
  PUMP_EFFICIENCY_DROP: 'Pump efficiency drop',
  FILTER_CLOGGING: 'Filter clogging',
  LEAK_REPORTED: 'Leak reported',
  ASSET_DOWN: 'Asset down',
  WATER_LEVEL_FALLING: 'Water level falling',
  WATER_ALLOCATION: 'Water allocation',
  WATER_ANOMALY: 'Water use anomaly',
  SENSOR_FAULT: 'Sensor fault',
};
