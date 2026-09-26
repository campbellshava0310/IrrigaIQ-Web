import type { CropType, IrrigationMethod, SoilType } from '@/features/farms/types';

export type GrowthPhase = 'INITIAL' | 'DEVELOPMENT' | 'MID_SEASON' | 'LATE_SEASON' | 'HARVEST';

export type Decision =
  | 'NOT_PLANTED'
  | 'SEASON_ENDED'
  | 'IRRIGATE_NOW'
  | 'IRRIGATE_SOON'
  | 'HOLD_FOR_RAIN'
  | 'SCHEDULED'
  | 'ON_TRACK';

export type WaterStatus =
  'NOT_PLANTED' | 'SEASON_ENDED' | 'ADEQUATE' | 'IRRIGATE_SOON' | 'IRRIGATE_NOW' | 'STRESSED';

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type IrrigationStatus = 'PLANNED' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED';
export type IrrigationSource = 'RECOMMENDATION' | 'MANUAL' | 'SCHEDULE';
export type ObservationMethod = 'FEEL' | 'PROBE' | 'TENSIOMETER' | 'SENSOR';
export type PowerSource = 'GRID' | 'SOLAR' | 'DIESEL' | 'HYBRID';

export interface PumpRef {
  id: string;
  name: string;
  powerSource: PowerSource | null;
}

export interface Schedule {
  startTime: string;
  sessions: number;
  sessionMinutes: number;
  windowLabel: string;
  note: string | null;
}

export interface Recommendation {
  decision: Decision;
  status: WaterStatus;
  irrigateOn: string | null;
  daysUntilStress: number | null;
  netDepthMm: number;
  grossDepthMm: number;
  volumeM3: number;
  durationMinutes: number;
  schedule: Schedule;
  energyKwh: number | null;
  energyCost: number | null;
  currency: string;
  expectedRainMm: number;
  reasons: string[];
  confidence: Confidence;
  confidenceNote: string;
  /** FAO56_WATER_BALANCE today; an ML model once sensors are connected. */
  source: string;
  modelVersion: string;
}

export interface IrrigationEvent {
  id: string;
  fieldId: string;
  fieldName: string;
  status: IrrigationStatus;
  source: IrrigationSource;
  startedAt: string;
  durationMinutes: number;
  grossDepthMm: number | null;
  volumeM3: number;
  pumpAssetId: string | null;
  energyKwh: number | null;
  notes: string | null;
  completedAt: string | null;
  /** A planned run whose start has passed without being confirmed. */
  overdue: boolean;
}

export interface FieldStatus {
  fieldId: string;
  fieldName: string;
  areaHa: number | null;
  cropType: CropType | null;
  variety: string | null;
  plantingDate: string | null;
  phase: GrowthPhase | null;
  daysAfterPlanting: number | null;
  seasonLengthDays: number | null;
  irrigationMethod: IrrigationMethod | null;
  systemConfigured: boolean;
  pump: PumpRef | null;
  depletionMm: number;
  depletionPct: number;
  stressThresholdPct: number;
  tawMm: number;
  recommendation: Recommendation;
  nextPlanned: IrrigationEvent | null;
  lastIrrigation: IrrigationEvent | null;
  yieldAtRiskPct: number | null;
  stressDays: number | null;
}

export interface BalanceDay {
  date: string;
  forecast: boolean;
  kc: number;
  et0Mm: number;
  etcMm: number;
  etaMm: number;
  rainMm: number;
  effectiveRainMm: number;
  irrigationMm: number;
  plannedIrrigationMm: number;
  depletionMm: number;
  depletionPct: number;
  stressThresholdPct: number;
  tawMm: number;
  ks: number;
}

export interface Season {
  daysAfterPlanting: number;
  seasonLengthDays: number;
  phase: GrowthPhase;
  kc: number;
  etcMm: number;
  etaMm: number;
  effectiveRainMm: number;
  irrigationMm: number;
  stressDays: number;
  relativeEtPct: number;
  yieldReductionPct: number;
  attainableYieldTHa: number;
  expectedYieldTHa: number;
}

export interface IrrigationSetup {
  method: IrrigationMethod;
  methodDefaulted: boolean;
  applicationRateMmH: number;
  rateDefaulted: boolean;
  efficiency: number;
  efficiencyDefaulted: boolean;
  soilType: SoilType;
  soilDefaulted: boolean;
  availableWaterMmPerM: number;
  pump: PumpRef | null;
}

export interface WaterBalance {
  today: string;
  status: FieldStatus;
  season: Season | null;
  setup: IrrigationSetup;
  days: BalanceDay[];
  weatherLive: boolean;
  locationApproximate: boolean;
}

export interface SoilObservation {
  id: string;
  fieldId: string;
  observedAt: string;
  depletionPct: number;
  method: ObservationMethod;
  notes: string | null;
}

export interface SetupInput {
  method: IrrigationMethod | null;
  applicationRateMmH: number | null;
  efficiency: number | null;
  pumpAssetId: string | null;
}

export interface LogIrrigationInput {
  status: 'COMPLETED' | 'PLANNED';
  source?: IrrigationSource;
  startedAt: string;
  durationMinutes: number;
  grossDepthMm?: number | null;
  volumeM3?: number | null;
  pumpAssetId?: string | null;
  energyKwh?: number | null;
  notes?: string | null;
}

export interface CompleteIrrigationInput {
  startedAt?: string | null;
  durationMinutes?: number | null;
  volumeM3?: number | null;
  energyKwh?: number | null;
  notes?: string | null;
}

export interface ObservationInput {
  observedAt?: string | null;
  depletionPct: number;
  method: ObservationMethod;
  notes?: string | null;
}

export interface EventQuery {
  from: string;
  to: string;
  fieldId?: string;
  status?: IrrigationStatus;
}
