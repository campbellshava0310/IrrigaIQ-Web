import type { Role } from '@/lib/auth/types';

export const ROLES: { value: Role; label: string; description: string }[] = [
  {
    value: 'FARM_MANAGER',
    label: 'Farm manager',
    description: 'Manages their own farms, fields and crops',
  },
  {
    value: 'ADMIN',
    label: 'Administrator',
    description: 'Manages users and sees every farm and the audit log',
  },
];

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
  enabled: boolean;
  locked: boolean;
  lockedUntil: string | null;
  failedLoginAttempts: number;
  lastLoginAt: string | null;
  passwordChangedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  fullName: string;
  temporaryPassword: string;
  roles: Role[];
}

export interface UpdateUserInput {
  fullName?: string;
  roles?: Role[];
  enabled?: boolean;
}

export interface AdminOverview {
  users: { total: number; enabled: number; locked: number; admins: number };
  activeSessions: number;
  farms: { farms: number; fields: number; crops: number };
}

export interface DemoFarmResult {
  farmId: string;
  farmName: string;
  ownerEmail: string;
  fields: number;
  assets: number;
  irrigations: number;
  conditionChecks: number;
  workOrders: number;
  openAlerts: number;
}

export const AUDIT_ACTIONS = [
  'LOGIN',
  'LOGOUT',
  'ACCOUNT_LOCKED',
  'REFRESH_TOKEN_REUSE',
  'USER_REGISTERED',
  'PROFILE_UPDATED',
  'PASSWORD_CHANGED',
  'SESSION_REVOKED',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_UNLOCKED',
  'USER_SESSIONS_REVOKED',
  'FARM_CREATED',
  'FARM_DELETED',
  'ASSET_CREATED',
  'ASSET_DELETED',
  'ASSET_STATUS_CHANGED',
  'WORK_ORDER_COMPLETED',
  'DEMO_FARM_CREATED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Words for codes that would read wrongly when humanized (the codes are an API contract). */
export const AUDIT_ACTION_LABEL: Partial<Record<AuditAction, string>> = {
  DEMO_FARM_CREATED: 'Sample farm created',
};

export interface AuditEvent {
  id: string;
  occurredAt: string;
  action: AuditAction;
  outcome: 'SUCCESS' | 'FAILURE';
  actorUserId: string | null;
  actorEmail: string | null;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  details: Record<string, unknown> | null;
}

export interface HealthComponent {
  status: string;
  details?: Record<string, unknown>;
  components?: Record<string, HealthComponent>;
}

export interface Health extends HealthComponent {
  groups?: string[];
}
