import type { PowerSource } from '@/features/irrigation/types';

export const ASSET_CATEGORIES = [
  'WATER_SOURCE',
  'PUMPING',
  'POWER',
  'TREATMENT',
  'DISTRIBUTION',
  'APPLICATION',
  'CONTROL',
] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export const ASSET_TYPES = {
  BOREHOLE: 'WATER_SOURCE',
  RESERVOIR: 'WATER_SOURCE',
  RIVER_INTAKE: 'WATER_SOURCE',
  STORAGE_TANK: 'WATER_SOURCE',
  PUMP: 'PUMPING',
  SOLAR_ARRAY: 'POWER',
  GENERATOR: 'POWER',
  FILTER: 'TREATMENT',
  FERTIGATION_UNIT: 'TREATMENT',
  MAINLINE: 'DISTRIBUTION',
  VALVE: 'DISTRIBUTION',
  FLOW_METER: 'DISTRIBUTION',
  DRIP_SYSTEM: 'APPLICATION',
  SPRINKLER_SYSTEM: 'APPLICATION',
  CENTER_PIVOT: 'APPLICATION',
  CONTROLLER: 'CONTROL',
} as const satisfies Record<string, AssetCategory>;
export type AssetType = keyof typeof ASSET_TYPES;

export const ASSET_STATUSES = [
  'OPERATIONAL',
  'DEGRADED',
  'DOWN',
  'UNDER_MAINTENANCE',
  'RETIRED',
] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const CRITICALITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type Criticality = (typeof CRITICALITIES)[number];

export const POWER_SOURCES = [
  'GRID',
  'SOLAR',
  'DIESEL',
  'HYBRID',
] as const satisfies readonly PowerSource[];

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type FactorSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type OverallCondition = 'GOOD' | 'FAIR' | 'POOR';
export type VibrationLevel = 'NORMAL' | 'ELEVATED' | 'SEVERE';

export interface HealthFactor {
  code: string;
  label: string;
  detail: string;
  /** Points taken off (negative) the 100-point health score. */
  impact: number;
  severity: FactorSeverity;
  action: string | null;
}

export interface ServiceForecast {
  dueOn: string | null;
  basis: 'CALENDAR' | 'RUN_HOURS' | string;
  daysRemaining: number | null;
  runHoursRemaining: number | null;
  overdue: boolean;
  /** Share of the service interval used; above 100 when overdue. */
  progressPct: number;
}

export interface Health {
  score: number;
  risk: RiskLevel;
  factors: HealthFactor[];
  service: ServiceForecast | null;
  energyKwhPerM3: number | null;
  energyDriftPct: number | null;
  outlook: string;
  recommendedAction: string | null;
  /** RULES today; MODEL once sensor-trained models score the asset. */
  source: string;
  modelVersion: string;
}

export interface Asset {
  id: string;
  farmId: string;
  fieldId: string | null;
  parentId: string | null;
  type: AssetType;
  category: AssetCategory;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  installedOn: string | null;
  criticality: Criticality;
  status: AssetStatus;
  powerSource: PowerSource | null;
  ratedPowerKw: number | null;
  ratedFlowM3h: number | null;
  ratedHeadM: number | null;
  capacityM3: number | null;
  annualAllocationM3: number | null;
  operatingWindowStart: string | null;
  operatingWindowEnd: string | null;
  serviceIntervalDays: number | null;
  serviceIntervalHours: number | null;
  expectedLifeYears: number | null;
  operatingHours: number | null;
  hoursAtLastService: number | null;
  lastServiceOn: string | null;
  baselineEnergyKwhPerM3: number | null;
  notes: string | null;
  health: Health | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConditionCheck {
  id: string;
  assetId: string;
  checkedAt: string;
  overallCondition: OverallCondition;
  pressureBar: number | null;
  flowM3h: number | null;
  powerKw: number | null;
  hourMeter: number | null;
  vibration: VibrationLevel | null;
  leakDetected: boolean;
  filterDpBar: number | null;
  waterLevelM: number | null;
  energyKwhPerM3: number | null;
  notes: string | null;
}

export interface AssetDetail {
  asset: Asset;
  recentChecks: ConditionCheck[];
  children: Asset[];
  parent: Asset | null;
}

export interface AssetInput {
  type: AssetType;
  name: string;
  fieldId: string | null;
  parentId: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  installedOn: string | null;
  criticality: Criticality | null;
  status: AssetStatus | null;
  powerSource: PowerSource | null;
  ratedPowerKw: number | null;
  ratedFlowM3h: number | null;
  ratedHeadM: number | null;
  capacityM3: number | null;
  annualAllocationM3: number | null;
  operatingWindowStart: string | null;
  operatingWindowEnd: string | null;
  serviceIntervalDays: number | null;
  serviceIntervalHours: number | null;
  expectedLifeYears: number | null;
  lastServiceOn: string | null;
  baselineEnergyKwhPerM3: number | null;
  operatingHours: number | null;
  notes: string | null;
}

export interface ConditionCheckInput {
  checkedAt: string | null;
  overallCondition: OverallCondition;
  pressureBar: number | null;
  flowM3h: number | null;
  powerKw: number | null;
  hourMeter: number | null;
  vibration: VibrationLevel | null;
  leakDetected: boolean;
  filterDpBar: number | null;
  waterLevelM: number | null;
  notes: string | null;
}
