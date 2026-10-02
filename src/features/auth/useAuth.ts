import { useSyncExternalStore } from 'react';

import { session, type SessionState } from '@/lib/auth/session';
import type { Role } from '@/lib/auth/types';

export function useSession(): SessionState {
  return useSyncExternalStore(session.subscribe, session.getState);
}

export function useAuth() {
  const state = useSession();
  const roles = state.user?.roles ?? [];
  return {
    ...state,
    hasRole: (role: Role) => roles.includes(role),
    isAdmin: roles.includes('ADMIN'),
    login: session.login,
    register: session.register,
    logout: session.logout,
  };
}
