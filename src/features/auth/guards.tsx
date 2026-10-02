import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';

import { FullPageLoader } from '@/components/FullPageLoader';
import { ForbiddenPage } from '@/components/StatusPages';
import type { Role } from '@/lib/auth/types';

import { useAuth } from './useAuth';

/** Renders children only for signed-in users; everyone else is sent to sign-in and back. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'initializing') {
    return <FullPageLoader />;
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

/**
 * UX gate only: it hides screens the user cannot use. The API enforces every permission
 * independently, so bypassing this in the browser grants nothing.
 */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { hasRole } = useAuth();
  return hasRole(role) ? children : <ForbiddenPage />;
}

/** Public-only pages (sign-in, registration) bounce signed-in users into the app. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === 'initializing') {
    return <FullPageLoader />;
  }
  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }
  return children;
}
