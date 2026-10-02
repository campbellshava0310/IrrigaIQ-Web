import type { MeterStatus, NeedLevel, RiskLevel, RiskSource } from './types';

/** The model's need rating: same colour ramp as the water balance's own statuses. */
export const NEED: Record<NeedLevel, { label: string; color: string }> = {
  High: { label: 'High need', color: 'orange' },
  Medium: { label: 'Moderate need', color: 'yellow' },
  Low: { label: 'Low need', color: 'green' },
};

export const RISK_LEVEL: Record<RiskLevel, { label: string; color: string }> = {
  CRITICAL: { label: 'Critical', color: 'red' },
  HIGH: { label: 'High', color: 'orange' },
  MODERATE: { label: 'Moderate', color: 'yellow' },
  LOW: { label: 'Low', color: 'green' },
};

export const RISK_SOURCE: Record<RiskSource, string> = {
  PUMP_MONITOR: 'pump monitor (7-day means)',
  CONDITION_CHECK: 'latest condition check',
  SERVICE_RECORDS: 'service and age records',
};

export const METER_STATUS: Record<
  MeterStatus,
  { label: string; color: string; description: string }
> = {
  ANOMALY: {
    label: 'Possible anomaly',
    color: 'orange',
    description: 'Flow is outside what this meter normally records at these hours.',
  },
  OK: { label: 'Normal', color: 'green', description: 'Flow matches this meter’s usual pattern.' },
  INSUFFICIENT_HISTORY: {
    label: 'Learning',
    color: 'gray',
    description: 'Needs about three days of readings before it can judge.',
  },
  NOT_REPORTING: {
    label: 'Not reporting',
    color: 'gray',
    description: 'No readings in the last three hours: check the meter’s power and connection.',
  },
  UNAVAILABLE: {
    label: 'Check unavailable',
    color: 'gray',
    description: 'The anomaly model is offline; flow is still recorded.',
  },
};

/** 0.1838 -> "18%". Probabilities under 1% read as "under 1%" rather than a misleading 0. */
export function formatProbability(value: number): string {
  if (value < 0.01) return 'under 1%';
  return `${Math.round(value * 100)}%`;
}
