export const SOIL_TYPES = [
  'SAND',
  'LOAMY_SAND',
  'SANDY_LOAM',
  'LOAM',
  'SILT_LOAM',
  'SILT',
  'SANDY_CLAY_LOAM',
  'CLAY_LOAM',
  'SILTY_CLAY_LOAM',
  'SANDY_CLAY',
  'SILTY_CLAY',
  'CLAY',
] as const;
export type SoilType = (typeof SOIL_TYPES)[number];

export const CROP_TYPES = ['TOMATO', 'MAIZE', 'WHEAT', 'SOYBEAN', 'POTATO', 'TOBACCO'] as const;
export type CropType = (typeof CROP_TYPES)[number];

/** Attainable yield under good management without water stress (t/ha); matches the backend defaults. */
export const TYPICAL_YIELD_T_HA: Record<CropType, number> = {
  TOMATO: 50,
  MAIZE: 8,
  WHEAT: 6,
  SOYBEAN: 3,
  POTATO: 35,
  TOBACCO: 2.8,
};

/** FAO-56 crop development stages. */
export const GROWTH_STAGES = ['INITIAL', 'DEVELOPMENT', 'MID_SEASON', 'LATE_SEASON'] as const;
export type GrowthStage = (typeof GROWTH_STAGES)[number];

export const GROWTH_STAGE_LABELS: Record<GrowthStage, string> = {
  INITIAL: 'Initial',
  DEVELOPMENT: 'Development',
  MID_SEASON: 'Mid-season',
  LATE_SEASON: 'Late season',
};

export interface Owner {
  id: string;
  fullName: string;
  email: string;
}

export const IRRIGATION_METHODS = [
  'DRIP',
  'MICRO_SPRINKLER',
  'SPRINKLER',
  'CENTER_PIVOT',
  'FURROW',
  'FLOOD',
] as const;
export type IrrigationMethod = (typeof IRRIGATION_METHODS)[number];

/** Typical application efficiency and rate per method; mirrors the backend defaults. */
export const IRRIGATION_METHOD_DEFAULTS: Record<
  IrrigationMethod,
  { label: string; efficiency: number; rateMmH: number }
> = {
  DRIP: { label: 'Drip', efficiency: 0.9, rateMmH: 3 },
  MICRO_SPRINKLER: { label: 'Micro-sprinkler', efficiency: 0.85, rateMmH: 5 },
  SPRINKLER: { label: 'Sprinkler', efficiency: 0.75, rateMmH: 8 },
  CENTER_PIVOT: { label: 'Centre pivot', efficiency: 0.85, rateMmH: 1 },
  FURROW: { label: 'Furrow', efficiency: 0.6, rateMmH: 12 },
  FLOOD: { label: 'Flood / basin', efficiency: 0.5, rateMmH: 20 },
};

export interface Farm {
  id: string;
  name: string;
  location: string | null;
  areaHa: number | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  currency: string;
  /** Grid electricity price per kWh in the farm's currency. */
  electricityTariff: number | null;
  /** The conventional calendar schedule that water savings are measured against. */
  baselineIntervalDays: number;
  baselineDepthMm: number;
  owner: Owner;
  fieldCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FarmInput {
  name: string;
  location: string | null;
  areaHa: number | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  currency?: string | null;
  electricityTariff?: number | null;
  baselineIntervalDays?: number | null;
  baselineDepthMm?: number | null;
}

export interface Field {
  id: string;
  farmId: string;
  name: string;
  areaHa: number | null;
  soilType: SoilType | null;
  latitude: number | null;
  longitude: number | null;
  irrigationMethod: IrrigationMethod | null;
  applicationRateMmH: number | null;
  systemEfficiency: number | null;
  pumpAssetId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FieldInput {
  name: string;
  areaHa: number | null;
  soilType: SoilType | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Crop {
  id: string;
  fieldId: string;
  cropType: CropType;
  variety: string | null;
  plantingDate: string | null;
  growthStage: GrowthStage;
  expectedYieldTHa: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CropInput {
  cropType: CropType;
  variety: string | null;
  plantingDate: string | null;
  growthStage: GrowthStage;
  /** Attainable yield without water stress (t/ha); defaults to a typical value per crop. */
  expectedYieldTHa: number | null;
}
