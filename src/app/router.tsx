import { createBrowserRouter, Navigate, Outlet } from 'react-router';

import { NotFoundPage, RouteErrorPage } from '@/components/StatusPages';
import { AccountPage } from '@/features/account/pages/AccountPage';
import { AlertsPage } from '@/features/alerts/pages/AlertsPage';
import { RequireAuth, RequireRole } from '@/features/auth/guards';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { OverviewPage } from '@/features/dashboard/pages/OverviewPage';
import { CurrentFarmProvider } from '@/features/farms/CurrentFarmProvider';
import { FarmDetailPage } from '@/features/farms/pages/FarmDetailPage';
import { FarmsPage } from '@/features/farms/pages/FarmsPage';
import { InfrastructurePage } from '@/features/infrastructure/pages/InfrastructurePage';
import { IntelligencePage } from '@/features/intelligence/pages/IntelligencePage';
import { IrrigationPage } from '@/features/irrigation/pages/IrrigationPage';
import { MaintenancePage } from '@/features/maintenance/pages/MaintenancePage';

import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <CurrentFarmProvider>
          <AppLayout />
        </CurrentFarmProvider>
      </RequireAuth>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'farms', element: <FarmsPage /> },
      { path: 'farms/:farmId', element: <FarmDetailPage /> },
      {
        path: 'devices',
        lazy: async () => ({
          Component: (await import('@/features/devices/pages/DevicesPage')).DevicesPage,
        }),
      },
      // Pages with charts are code-split so Recharts only loads when a chart is on screen.
      {
        path: 'farms/:farmId/fields/:fieldId',
        lazy: async () => ({
          Component: (await import('@/features/farms/pages/FieldDetailPage')).FieldDetailPage,
        }),
      },
      {
        path: 'farms/:farmId/assets/:assetId',
        lazy: async () => ({
          Component: (await import('@/features/infrastructure/pages/AssetDetailPage'))
            .AssetDetailPage,
        }),
      },
      { path: 'irrigation', element: <IrrigationPage /> },
      {
        path: 'water',
        lazy: async () => ({
          Component: (await import('@/features/water/pages/WaterPage')).WaterPage,
        }),
      },
      { path: 'infrastructure', element: <InfrastructurePage /> },
      { path: 'equipment', element: <Navigate to="/infrastructure" replace /> },
      { path: 'maintenance', element: <MaintenancePage /> },
      { path: 'alerts', element: <AlertsPage /> },
      { path: 'intelligence', element: <IntelligencePage /> },
      { path: 'account', element: <AccountPage /> },
      {
        // Admin screens are code-split: farm managers never download them.
        path: 'admin',
        element: (
          <RequireRole role="ADMIN">
            <Outlet />
          </RequireRole>
        ),
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('@/features/admin/pages/AdminOverviewPage'))
                .AdminOverviewPage,
            }),
          },
          {
            path: 'users',
            lazy: async () => ({
              Component: (await import('@/features/admin/pages/AdminUsersPage')).AdminUsersPage,
            }),
          },
          {
            path: 'audit',
            lazy: async () => ({
              Component: (await import('@/features/admin/pages/AdminAuditPage')).AdminAuditPage,
            }),
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
