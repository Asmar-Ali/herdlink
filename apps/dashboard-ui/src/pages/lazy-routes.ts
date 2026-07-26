import { lazy } from 'react';

/*
 * Lazy-loaded authed pages, kept in their own module so `router.tsx` exports
 * only the router (Fast Refresh wants component files to export components
 * exclusively). Splitting these keeps Recharts in the dashboard chunk.
 */

export const DashboardPage = lazy(() =>
  import('./dashboard/DashboardPage.tsx').then((m) => ({
    default: m.DashboardPage,
  })),
);

export const DevicesPage = lazy(() =>
  import('./devices/DevicesPage.tsx').then((m) => ({
    default: m.DevicesPage,
  })),
);

export const FencesPage = lazy(() =>
  import('./fences/FencesPage.tsx').then((m) => ({
    default: m.FencesPage,
  })),
);
