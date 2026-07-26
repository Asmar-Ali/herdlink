import { Suspense, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { CenteredSpinner } from '../ui/Spinner.tsx';
import { Header } from './Header.tsx';
import { Sidebar } from './Sidebar.tsx';

const TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Dashboard',
    subtitle: 'Fleet health and geofence activity at a glance',
  },
  '/devices': {
    title: 'Devices',
    subtitle: 'Register, monitor and manage collar hardware',
  },
  '/fences': {
    title: 'Fences',
    subtitle: 'Geofences and breach-alert boundaries',
  },
};

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const meta = TITLES[pathname] ?? TITLES['/'];

  return (
    <div className="min-h-svh bg-[var(--bg)]">
      <Sidebar
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
      />

      <div className="md:pl-64">
        <Header
          title={meta.title}
          subtitle={meta.subtitle}
          onOpenMenu={() => setMobileOpen(true)}
        />
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
          <Suspense fallback={<CenteredSpinner label="Loading…" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
