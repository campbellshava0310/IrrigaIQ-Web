import {
  IconAlertTriangle,
  IconDroplet,
  IconDroplets,
  IconEngine,
  IconHistory,
  IconLayoutDashboard,
  IconPlant2,
  IconShieldCheck,
  IconSparkles,
  IconTool,
  IconUsers,
  type Icon,
} from '@tabler/icons-react';

import type { Role } from '@/lib/auth/types';

export interface NavItem {
  label: string;
  to: string;
  icon: Icon;
  /** Match the path exactly instead of as a prefix. */
  end?: boolean;
  /** Extra path prefixes that belong to this item (detail routes nested under a farm). */
  alsoMatches?: RegExp;
  /** Live count shown next to the label. */
  badge?: 'alerts';
}

export interface NavSection {
  title: string;
  items: NavItem[];
  requiredRole?: Role;
}

/** Single source of truth for the sidebar. Operations screens are scoped to the farm in the header. */
export const NAVIGATION: NavSection[] = [
  {
    title: 'Operations',
    items: [
      { label: 'Overview', to: '/', icon: IconLayoutDashboard, end: true },
      {
        label: 'Irrigation',
        to: '/irrigation',
        icon: IconDroplet,
        alsoMatches: /^\/farms\/[^/]+\/fields\//,
      },
      { label: 'Water', to: '/water', icon: IconDroplets },
      {
        label: 'Infrastructure',
        to: '/infrastructure',
        icon: IconEngine,
        alsoMatches: /^\/farms\/[^/]+\/assets\//,
      },
      { label: 'Maintenance', to: '/maintenance', icon: IconTool },
      { label: 'Alerts', to: '/alerts', icon: IconAlertTriangle, badge: 'alerts' },
      { label: 'Farm intelligence', to: '/intelligence', icon: IconSparkles },
    ],
  },
  {
    title: 'Setup',
    items: [{ label: 'Farms & fields', to: '/farms', icon: IconPlant2 }],
  },
  {
    title: 'Administration',
    requiredRole: 'ADMIN',
    items: [
      { label: 'Admin overview', to: '/admin', icon: IconShieldCheck, end: true },
      { label: 'Users', to: '/admin/users', icon: IconUsers },
      { label: 'Audit log', to: '/admin/audit', icon: IconHistory },
    ],
  },
];

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.alsoMatches?.test(pathname)) {
    return true;
  }
  if (item.end) {
    return pathname === item.to;
  }
  // "Farms & fields" should not stay highlighted on field/asset detail pages owned by other items.
  if (item.to === '/farms' && /^\/farms\/[^/]+\/(fields|assets)\//.test(pathname)) {
    return false;
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
