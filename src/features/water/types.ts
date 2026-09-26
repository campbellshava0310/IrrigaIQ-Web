import type { AssetType } from '@/features/infrastructure/types';

export interface FieldWater {
  fieldId: string;
  fieldName: string;
  appliedM3: number;
  requirementM3: number;
  baselineM3: number;
  savedM3: number;
  irrigations: number;
}

export interface DailyWater {
  date: string;
  appliedM3: number;
  requirementM3: number;
  rainMm: number;
  et0Mm: number;
}

export interface SourceAllocation {
  assetId: string;
  name: string;
  type: AssetType;
  annualAllocationM3: number;
  usedYearToDateM3: number;
  usedPct: number;
}

export interface WaterSummary {
  from: string;
  to: string;
  currency: string;
  appliedM3: number;
  plannedM3: number;
  requirementM3: number;
  /** Applied as a share of crop requirement: 100 = exactly met, above = over-irrigation. */
  adequacyPct: number | null;
  baselineM3: number;
  savedM3: number;
  savedPct: number | null;
  energyKwh: number;
  energyCost: number | null;
  baselineDescription: string;
  fields: FieldWater[];
  daily: DailyWater[];
  allocations: SourceAllocation[];
  unattributedYearToDateM3: number;
}
