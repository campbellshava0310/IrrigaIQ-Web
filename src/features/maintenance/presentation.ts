import type { WorkOrderKind, WorkOrderPriority, WorkOrderStatus } from './types';

export const KIND: Record<WorkOrderKind, { label: string; color: string; description: string }> = {
  PREVENTIVE: { label: 'Preventive', color: 'teal', description: 'Scheduled service' },
  PREDICTIVE: {
    label: 'Predictive',
    color: 'violet',
    description: 'Raised by a health warning before failure',
  },
  CORRECTIVE: { label: 'Corrective', color: 'orange', description: 'Repair after a fault' },
  INSPECTION: { label: 'Inspection', color: 'blue', description: 'Look-and-record visit' },
};

export const PRIORITY: Record<WorkOrderPriority, { label: string; color: string; rank: number }> = {
  URGENT: { label: 'Urgent', color: 'red', rank: 0 },
  HIGH: { label: 'High', color: 'orange', rank: 1 },
  MEDIUM: { label: 'Medium', color: 'yellow', rank: 2 },
  LOW: { label: 'Low', color: 'gray', rank: 3 },
};

export const STATUS: Record<WorkOrderStatus, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: 'gray' },
  SCHEDULED: { label: 'Scheduled', color: 'blue' },
  IN_PROGRESS: { label: 'In progress', color: 'yellow' },
  DONE: { label: 'Done', color: 'teal' },
  CANCELLED: { label: 'Cancelled', color: 'gray' },
};
