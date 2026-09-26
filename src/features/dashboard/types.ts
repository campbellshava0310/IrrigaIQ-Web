import type { AlertSummary } from '@/features/alerts/types';
import type { CropType } from '@/features/farms/types';
import type { AssetStatus, AssetType, RiskLevel } from '@/features/infrastructure/types';
import type { Decision, GrowthPhase, WaterStatus } from '@/features/irrigation/types';

export type WeatherSource = 'OPEN_METEO' | 'CLIMATOLOGY';

export interface WeatherDay {
  date: string;
  et0Mm: number | null;
  precipitationMm: number | null;
  precipitationProbability: number | null;
  tempMaxC: number | null;
  tempMinC: number | null;
  source: WeatherSource;
  forecast: boolean;
}

export type TaskKind = 'IRRIGATE' | 'CONFIRM_IRRIGATION' | 'WORK_ORDER' | 'BOOK_SERVICE';

export interface Task {
  kind: TaskKind;
  /** 1 = do first. */
  priority: number;
  title: string;
  detail: string;
  dueOn: string | null;
  fieldId: string | null;
  assetId: string | null;
  workOrderId: string | null;
  irrigationEventId: string | null;
}

export interface FieldTile {
  fieldId: string;
  name: string;
  cropType: CropType | null;
  phase: GrowthPhase | null;
  status: WaterStatus;
  decision: Decision;
  depletionPct: number;
  stressThresholdPct: number;
  irrigateOn: string | null;
  grossDepthMm: number;
  volumeM3: number;
  durationMinutes: number;
  startTime: string | null;
  nextPlannedAt: string | null;
  yieldAtRiskPct: number | null;
}

export interface AssetTile {
  assetId: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  healthScore: number;
  risk: RiskLevel;
  topFactor: string | null;
  nextServiceOn: string | null;
}

export interface Dashboard {
  farmId: string;
  farmName: string;
  location: string | null;
  today: string;
  timezone: string;
  weatherLive: boolean;
  forecast: WeatherDay[];
  tasks: Task[];
  fields: {
    total: number;
    planted: number;
    byStatus: Partial<Record<WaterStatus, number>>;
    items: FieldTile[];
  };
  water: {
    weekAppliedM3: number;
    weekRequirementM3: number;
    weekAdequacyPct: number | null;
    monthSavedM3: number;
    monthSavedPct: number | null;
    weekEnergyKwh: number;
    weekEnergyCost: number | null;
    currency: string;
    baselineDescription: string;
  };
  assets: {
    total: number;
    byRisk: Partial<Record<RiskLevel, number>>;
    down: number;
    serviceOverdue: number;
    serviceDueSoon: number;
    attention: AssetTile[];
  };
  maintenance: { open: number; inProgress: number; overdue: number; dueThisWeek: number };
  alerts: AlertSummary;
}

export type Tone = 'GOOD' | 'WATCH' | 'ACTION';

export interface BriefingItem {
  text: string;
  tone: Tone;
  /** FIELD, ASSET, WORK_ORDER, ALERT, WEATHER or WATER. */
  linkType: string | null;
  linkId: string | null;
}

export interface BriefingSection {
  key: string;
  title: string;
  tone: Tone;
  items: BriefingItem[];
}

export interface Briefing {
  farmId: string;
  farmName: string;
  date: string;
  generatedAt: string;
  headline: string;
  sections: BriefingSection[];
  method: string;
  disclaimer: string;
}

export interface WeatherView {
  latitude: number;
  longitude: number;
  locationApproximate: boolean;
  live: boolean;
  today: string;
  days: WeatherDay[];
}
