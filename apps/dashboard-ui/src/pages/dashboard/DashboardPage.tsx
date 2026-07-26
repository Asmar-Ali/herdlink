import { ActiveDevicesArea } from '../../components/charts/ActiveDevicesArea.tsx';
import { BreachesBar } from '../../components/charts/BreachesBar.tsx';
import { DeviceStatusDonut } from '../../components/charts/DeviceStatusDonut.tsx';
import { Card, CardHeader } from '../../components/ui/Card.tsx';
import { CenteredSpinner } from '../../components/ui/Spinner.tsx';
import { StatTile } from '../../components/ui/StatTile.tsx';
import { useDashboardStats } from '../../lib/api/hooks.ts';

export function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading || !stats) {
    return <CenteredSpinner label="Loading fleet metrics…" />;
  }

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Active devices"
          value={stats.activeDevices}
          icon="devices"
          accent="good"
          delta={stats.activeDevicesDelta}
          hint={`of ${stats.totalDevices} registered`}
        />
        <StatTile
          label="Geofences"
          value={stats.totalFences}
          icon="fences"
          accent="accent"
          hint={`${stats.activeFences} active`}
        />
        <StatTile
          label="Avg. battery"
          value={`${stats.avgBatteryLevel}%`}
          icon="battery"
          accent={stats.avgBatteryLevel < 30 ? 'warning' : 'accent'}
          hint={`${stats.lowBatteryDevices} below 20%`}
        />
        <StatTile
          label="Lost devices"
          value={stats.lostDevices}
          icon="signal-off"
          accent={stats.lostDevices > 0 ? 'critical' : 'good'}
          hint="no signal > 24h"
        />
      </div>

      {/* Trend — full width */}
      <Card>
        <CardHeader
          title="Active devices"
          subtitle="Devices reporting telemetry · last 14 days"
        />
        <ActiveDevicesArea data={stats.activeDevicesTrend} />
      </Card>

      {/* Two-up: status composition + breaches */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Fleet status"
            subtitle="Device distribution by state"
          />
          <DeviceStatusDonut data={stats.statusBreakdown} />
        </Card>
        <Card>
          <CardHeader
            title="Geofence breaches"
            subtitle="Boundary crossings · last 14 days"
          />
          <BreachesBar data={stats.breachesTrend} />
        </Card>
      </div>
    </div>
  );
}
