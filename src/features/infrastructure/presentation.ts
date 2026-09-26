import {
  IconAdjustments,
  IconArrowsSplit,
  IconBolt,
  IconBucketDroplet,
  IconCpu,
  IconDroplets,
  IconEngine,
  IconFilter,
  IconFlask,
  IconGauge,
  IconRipple,
  IconSolarPanel,
  IconSpray,
  IconWindmill,
  type Icon,
} from '@tabler/icons-react';

import type {
  AssetCategory,
  AssetStatus,
  AssetType,
  Criticality,
  FactorSeverity,
  OverallCondition,
  RiskLevel,
  VibrationLevel,
} from './types';

export const RISK: Record<RiskLevel, { label: string; color: string; description: string }> = {
  LOW: { label: 'Low risk', color: 'teal', description: 'Healthy; keep to the service plan.' },
  MODERATE: {
    label: 'Moderate risk',
    color: 'yellow',
    description: 'Wear signals; deal with them at the next service.',
  },
  HIGH: {
    label: 'High risk',
    color: 'orange',
    description: 'Likely to fail within weeks without attention.',
  },
  CRITICAL: {
    label: 'Critical',
    color: 'red',
    description: 'Failure is imminent or has happened.',
  },
};

export const ASSET_STATUS: Record<AssetStatus, { label: string; color: string }> = {
  OPERATIONAL: { label: 'Operational', color: 'teal' },
  DEGRADED: { label: 'Degraded', color: 'yellow' },
  DOWN: { label: 'Down', color: 'red' },
  UNDER_MAINTENANCE: { label: 'Under maintenance', color: 'blue' },
  RETIRED: { label: 'Retired', color: 'gray' },
};

export const CRITICALITY: Record<Criticality, { label: string; description: string }> = {
  LOW: { label: 'Low', description: 'Failure is an inconvenience.' },
  MEDIUM: { label: 'Medium', description: 'Failure stops part of one block.' },
  HIGH: { label: 'High', description: 'Failure stops irrigation of a field.' },
  CRITICAL: { label: 'Critical', description: 'Failure stops irrigation farm-wide.' },
};

export const CATEGORY: Record<AssetCategory, { label: string; order: number }> = {
  WATER_SOURCE: { label: 'Water sources', order: 0 },
  POWER: { label: 'Power', order: 1 },
  PUMPING: { label: 'Pumps', order: 2 },
  TREATMENT: { label: 'Filtration & fertigation', order: 3 },
  DISTRIBUTION: { label: 'Distribution', order: 4 },
  APPLICATION: { label: 'In-field systems', order: 5 },
  CONTROL: { label: 'Control', order: 6 },
};

export const ASSET_TYPE: Record<AssetType, { label: string; icon: Icon }> = {
  BOREHOLE: { label: 'Borehole', icon: IconBucketDroplet },
  RESERVOIR: { label: 'Dam / reservoir', icon: IconRipple },
  RIVER_INTAKE: { label: 'River intake', icon: IconRipple },
  STORAGE_TANK: { label: 'Storage tank', icon: IconBucketDroplet },
  PUMP: { label: 'Pump', icon: IconEngine },
  SOLAR_ARRAY: { label: 'Solar array', icon: IconSolarPanel },
  GENERATOR: { label: 'Generator', icon: IconBolt },
  FILTER: { label: 'Filter', icon: IconFilter },
  FERTIGATION_UNIT: { label: 'Fertigation unit', icon: IconFlask },
  MAINLINE: { label: 'Mainline', icon: IconArrowsSplit },
  VALVE: { label: 'Valve', icon: IconAdjustments },
  FLOW_METER: { label: 'Flow meter', icon: IconGauge },
  DRIP_SYSTEM: { label: 'Drip system', icon: IconDroplets },
  SPRINKLER_SYSTEM: { label: 'Sprinkler system', icon: IconSpray },
  CENTER_PIVOT: { label: 'Centre pivot', icon: IconWindmill },
  CONTROLLER: { label: 'Controller', icon: IconCpu },
};

export const FACTOR_SEVERITY: Record<FactorSeverity, { label: string; color: string }> = {
  CRITICAL: { label: 'Critical', color: 'red' },
  WARNING: { label: 'Warning', color: 'orange' },
  INFO: { label: 'Note', color: 'blue' },
};

export const CONDITION: Record<OverallCondition, { label: string; color: string }> = {
  GOOD: { label: 'Good', color: 'teal' },
  FAIR: { label: 'Fair', color: 'yellow' },
  POOR: { label: 'Poor', color: 'red' },
};

export const VIBRATION: Record<VibrationLevel, { label: string; hint: string }> = {
  NORMAL: { label: 'Normal', hint: 'Smooth hum, no rattle' },
  ELEVATED: { label: 'Elevated', hint: 'Noticeable buzz or knock' },
  SEVERE: { label: 'Severe', hint: 'Shaking, grinding or hot bearings' },
};

/** Health score colour: same thresholds as the backend's risk bands. */
export function scoreColor(score: number): string {
  if (score >= 80) return 'teal';
  if (score >= 60) return 'yellow';
  if (score >= 40) return 'orange';
  return 'red';
}

/** Which measurements a condition check asks for, by asset type. */
export function checkFieldsFor(type: AssetType) {
  return {
    pump: type === 'PUMP',
    filter: type === 'FILTER',
    waterLevel: type === 'BOREHOLE' || type === 'RESERVOIR' || type === 'STORAGE_TANK',
    pressure: [
      'PUMP',
      'FILTER',
      'MAINLINE',
      'DRIP_SYSTEM',
      'SPRINKLER_SYSTEM',
      'CENTER_PIVOT',
      'VALVE',
    ].includes(type),
    leak: [
      'MAINLINE',
      'VALVE',
      'DRIP_SYSTEM',
      'SPRINKLER_SYSTEM',
      'CENTER_PIVOT',
      'STORAGE_TANK',
      'PUMP',
      'FILTER',
    ].includes(type),
    hourMeter: type === 'PUMP' || type === 'GENERATOR' || type === 'CENTER_PIVOT',
    vibration: type === 'PUMP' || type === 'GENERATOR',
  };
}
