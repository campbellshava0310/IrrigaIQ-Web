import type { GrowthPhase, WaterStatus } from '@/features/irrigation/types';

export type NeedLevel = 'Low' | 'Medium' | 'High';

export interface Driver {
  feature: string;
  label: string;
  value: string | number;
  typical: string | number;
  impact: number;
  direction: 'raises' | 'lowers';
}

export interface IrrigationPrediction {
  fieldId: string;
  need: NeedLevel;
  irrigationRequired: boolean;
  probabilities: Record<NeedLevel, number>;
  probabilityRequired: number;
  confidence: number;
  needIndex: number;
  drivers: Driver[];
  outOfRange: string[];
  modelVersion: string;
}

export interface ModelInputs {
  soilMoisturePct: number;
  soilMoistureSource: 'PROBE' | 'WATER_BALANCE';
  probeName: string | null;
  probeReadingPct: number | null;
  probeReadAt: string | null;
  depletionPct: number;
  temperatureC: number;
  windSpeedKmh: number;
  windAssumed: boolean;
  rainfallLast90DaysMm: number;
  rainfallMmAnnualised: number;
  growthPhase: GrowthPhase;
  mulched: boolean;
  weatherLive: boolean;
}

export interface Agreement {
  consistent: boolean;
  waterBalanceStatus: WaterStatus;
  note: string;
}

export interface FieldAssessment {
  fieldId: string;
  fieldName: string;
  status: 'OK' | 'NO_CROP' | 'UNAVAILABLE';
  prediction: IrrigationPrediction | null;
  inputs: ModelInputs | null;
  agreement: Agreement | null;
}

export interface IrrigationModelView {
  available: boolean;
  assessedAt: string;
  modelVersion: string | null;
  fields: FieldAssessment[];
}

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface Indicator {
  feature: string;
  label: string;
  value: string;
  healthy: string;
  impact: number;
  trend: 'up' | 'down';
}

export interface EquipmentRisk {
  assetId: string;
  failureProbability: number;
  horizonDays: number;
  riskLevel: RiskLevel;
  healthScore: number;
  recommendation: string;
  indicators: Indicator[];
  missing: string[];
  modelVersion: string;
}

export type RiskSource = 'PUMP_MONITOR' | 'CONDITION_CHECK' | 'SERVICE_RECORDS';

export interface PumpRisk {
  assetId: string;
  assetName: string;
  assetStatus: string;
  status: 'OK' | 'UNAVAILABLE';
  risk: EquipmentRisk | null;
  sources: RiskSource[];
  ruleHealthScore: number;
  ruleRisk: RiskLevel;
}

export interface EquipmentRiskView {
  available: boolean;
  assessedAt: string;
  pumps: PumpRisk[];
}

export interface Anomaly {
  from: string;
  to: string;
  hours: number;
  direction: 'HIGH' | 'LOW';
  observedLitresPerHour: number;
  expectedLitresPerHour: number;
  score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  duringScheduledIrrigation: boolean;
  headline: string;
  possibleCauses: string[];
}

export interface HourPoint {
  hour: string;
  observedLitres: number;
  expectedLitres: number | null;
  scheduled: boolean;
  anomalous: boolean;
}

export type MeterStatus =
  'OK' | 'ANOMALY' | 'INSUFFICIENT_HISTORY' | 'NOT_REPORTING' | 'UNAVAILABLE';

export interface MeterCheck {
  deviceId: string;
  meterName: string;
  assetId: string | null;
  assetName: string | null;
  fieldId: string | null;
  fieldName: string | null;
  status: MeterStatus;
  anomaly: Anomaly | null;
  hours: HourPoint[];
  lastReadingAt: string | null;
  modelVersion: string | null;
}

export interface WaterAnomalyView {
  available: boolean;
  checkedAt: string;
  meters: MeterCheck[];
}

/** A model card as published by the ML service; fields vary by model. */
export interface ModelCard {
  name: string;
  version: string;
  task: string;
  algorithm: string;
  trainedAt?: string;
  limitations?: string[];
  evaluation?: Record<string, unknown>;
  heldOutTest?: Record<string, number>;
  interpretation?: string;
  [key: string]: unknown;
}

export interface ModelCatalogue {
  available: boolean;
  models: ModelCard[];
}
