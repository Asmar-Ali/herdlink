import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { DeviceStatus } from '../../lib/api/types.ts';
import { titleCase } from '../../lib/format.ts';
import { useChartTheme } from './useChartTheme.ts';

type Datum = { status: DeviceStatus; count: number };

export function DeviceStatusDonut({ data }: { data: Datum[] }) {
  const t = useChartTheme();

  // Semantic status colours — identity is also carried by the labelled legend,
  // so the two neutral states never rely on colour alone.
  const colorFor: Record<DeviceStatus, string> = {
    [DeviceStatus.ACTIVE]: t.good,
    [DeviceStatus.INACTIVE]: t.neutral,
    [DeviceStatus.LOST]: t.critical,
    [DeviceStatus.DECOMMISSIONED]: t.axis,
  };

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const chartData = data.filter((d) => d.count > 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-2">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={2}
              stroke={t.surface}
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {chartData.map((d) => (
                <Cell key={d.status} fill={colorFor[d.status]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums text-[var(--text-h)]">
            {total}
          </span>
          <span className="text-[11px] text-[var(--text)]">devices</span>
        </div>
      </div>

      <ul className="w-full space-y-2">
        {data.map((d) => {
          const pct = total ? Math.round((d.count / total) * 100) : 0;
          return (
            <li key={d.status} className="flex items-center gap-2.5 text-sm">
              <span
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{ background: colorFor[d.status] }}
                aria-hidden
              />
              <span className="flex-1 text-[var(--text)]">
                {titleCase(d.status)}
              </span>
              <span className="font-medium tabular-nums text-[var(--text-h)]">
                {d.count}
              </span>
              <span className="w-9 text-right text-xs tabular-nums text-[var(--text-muted)]">
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
