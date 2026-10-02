export type AlertType =
  | 'IRRIGATION_REQUIRED'
  | 'CROP_WATER_STRESS'
  | 'RAIN_EXPECTED'
  | 'SERVICE_OVERDUE'
  | 'ASSET_FAILURE_RISK'
  | 'PUMP_EFFICIENCY_DROP'
  | 'FILTER_CLOGGING'
  | 'LEAK_REPORTED'
  | 'ASSET_DOWN'
  | 'WATER_LEVEL_FALLING'
  | 'WATER_ALLOCATION'
  | 'WATER_ANOMALY'
  | 'SENSOR_FAULT';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertState = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  state: AlertState;
  title: string;
  message: string;
  fieldId: string | null;
  fieldName: string | null;
  assetId: string | null;
  assetName: string | null;
  details: Record<string, unknown> | null;
  /** RULES today; MODEL once anomaly models run. */
  source: string;
  workOrderId: string | null;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  autoResolved: boolean;
}

export interface AlertSummary {
  open: number;
  acknowledged: number;
  critical: number;
  warning: number;
  info: number;
}

export interface WorkOrderLink {
  alert: Alert;
  workOrderId: string;
  reference: string;
}
