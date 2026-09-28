import {
  IconAlertOctagon,
  IconCalendarCheck,
  IconCircleCheck,
  IconClock,
  IconCloudRain,
  IconDroplet,
  IconFlag,
  IconPlant,
  type Icon,
} from '@tabler/icons-react';

import { formatDayLabel } from '@/lib/format';

import type {
  Confidence,
  Decision,
  GrowthPhase,
  IrrigationSource,
  IrrigationStatus,
  ObservationMethod,
  Recommendation,
  WaterStatus,
} from './types';

interface Presentation {
  label: string;
  color: string;
  icon: Icon;
}

/** Root-zone water state. Colours follow severity so the same state always reads the same. */
export const WATER_STATUS: Record<WaterStatus, Presentation & { description: string }> = {
  STRESSED: {
    label: 'Crop stressed',
    color: 'red',
    icon: IconAlertOctagon,
    description: 'The crop is short of water and yield is being lost.',
  },
  IRRIGATE_NOW: {
    label: 'Irrigate now',
    color: 'orange',
    icon: IconDroplet,
    description: 'The root zone has reached the stress threshold.',
  },
  IRRIGATE_SOON: {
    label: 'Irrigate soon',
    color: 'yellow',
    icon: IconClock,
    description: 'The root zone will reach the stress threshold within two days.',
  },
  ADEQUATE: {
    label: 'Adequate',
    color: 'green',
    icon: IconCircleCheck,
    description: 'The crop has the water it needs.',
  },
  NOT_PLANTED: {
    label: 'Not planted',
    color: 'gray',
    icon: IconPlant,
    description: 'Add a crop with its planting date to get recommendations.',
  },
  SEASON_ENDED: {
    label: 'Season ended',
    color: 'gray',
    icon: IconFlag,
    description: 'The crop has completed its season.',
  },
};

export const DECISION: Record<Decision, Presentation> = {
  IRRIGATE_NOW: { label: 'Irrigate today', color: 'orange', icon: IconDroplet },
  IRRIGATE_SOON: { label: 'Irrigate soon', color: 'yellow', icon: IconClock },
  HOLD_FOR_RAIN: { label: 'Hold for rain', color: 'blue', icon: IconCloudRain },
  SCHEDULED: { label: 'Scheduled', color: 'blue', icon: IconCalendarCheck },
  ON_TRACK: { label: 'On track', color: 'green', icon: IconCircleCheck },
  NOT_PLANTED: { label: 'Not planted', color: 'gray', icon: IconPlant },
  SEASON_ENDED: { label: 'Season ended', color: 'gray', icon: IconFlag },
};

/** One-line headline for a recommendation, e.g. "Irrigate by Mon, 28 Sep". */
export function decisionHeadline(recommendation: Recommendation): string {
  switch (recommendation.decision) {
    case 'IRRIGATE_NOW':
      return 'Irrigate today';
    case 'IRRIGATE_SOON':
      return `Irrigate by ${formatDayLabel(recommendation.irrigateOn)}`;
    case 'HOLD_FOR_RAIN':
      return 'Hold: rain should cover the deficit';
    case 'SCHEDULED':
      return 'Irrigation scheduled';
    case 'ON_TRACK':
      return recommendation.irrigateOn
        ? `On track · next around ${formatDayLabel(recommendation.irrigateOn)}`
        : 'On track';
    case 'NOT_PLANTED':
      return 'No active crop';
    case 'SEASON_ENDED':
      return 'Season complete';
  }
}

/** Decisions where applying water is the recommended next step. */
export function wantsWater(decision: Decision): boolean {
  return decision === 'IRRIGATE_NOW' || decision === 'IRRIGATE_SOON';
}

export const CONFIDENCE: Record<Confidence, { label: string; color: string }> = {
  HIGH: { label: 'High confidence', color: 'green' },
  MEDIUM: { label: 'Medium confidence', color: 'blue' },
  LOW: { label: 'Low confidence', color: 'gray' },
};

export const PHASE_LABEL: Record<GrowthPhase, string> = {
  INITIAL: 'Initial',
  DEVELOPMENT: 'Development',
  MID_SEASON: 'Mid-season',
  LATE_SEASON: 'Late season',
  HARVEST: 'Harvest',
};

export const EVENT_STATUS: Record<IrrigationStatus, { label: string; color: string }> = {
  PLANNED: { label: 'Planned', color: 'blue' },
  COMPLETED: { label: 'Completed', color: 'green' },
  SKIPPED: { label: 'Skipped', color: 'gray' },
  CANCELLED: { label: 'Cancelled', color: 'gray' },
};

export const EVENT_SOURCE: Record<IrrigationSource, string> = {
  RECOMMENDATION: 'Recommendation',
  MANUAL: 'Manual',
  SCHEDULE: 'Schedule',
};

export const OBSERVATION_METHOD: Record<ObservationMethod, string> = {
  FEEL: 'Feel & appearance',
  PROBE: 'Soil probe',
  TENSIOMETER: 'Tensiometer',
  SENSOR: 'Sensor',
};
