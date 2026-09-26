import type { AssetType } from '@/features/infrastructure/types';

export const WORK_ORDER_KINDS = ['PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE', 'INSPECTION'] as const;
export type WorkOrderKind = (typeof WORK_ORDER_KINDS)[number];

export const WORK_ORDER_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type WorkOrderPriority = (typeof WORK_ORDER_PRIORITIES)[number];

export type WorkOrderStatus = 'OPEN' | 'SCHEDULED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export interface WorkOrder {
  id: string;
  number: number;
  /** Human reference, e.g. WO-1001. */
  reference: string;
  farmId: string;
  asset: { id: string; name: string; type: AssetType } | null;
  alertId: string | null;
  kind: WorkOrderKind;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  title: string;
  description: string | null;
  dueOn: string | null;
  assignee: string | null;
  createdBy: string | null;
  startedAt: string | null;
  completedAt: string | null;
  completionNotes: string | null;
  cost: number | null;
  downtimeHours: number | null;
  overdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderInput {
  assetId: string | null;
  kind: WorkOrderKind;
  priority: WorkOrderPriority | null;
  title: string;
  description: string | null;
  dueOn: string | null;
  assignee: string | null;
}

export interface WorkOrderCompletion {
  notes: string | null;
  cost: number | null;
  downtimeHours: number | null;
  /** Restart the asset's service clock; defaults to true for preventive work. */
  resetServiceInterval: boolean | null;
  restoreOperational: boolean;
}
