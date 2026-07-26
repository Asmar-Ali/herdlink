import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TimeseriesPoint } from '../../lib/api/types.ts';
import { formatDayShort } from '../../lib/format.ts';
import { TooltipRow, TooltipShell } from './ChartTooltip.tsx';
import { useChartTheme } from './useChartTheme.ts';

interface TooltipInjected {
  active?: boolean;
  payload?: Array<{ payload: TimeseriesPoint }>;
}

function CustomTooltip({
  active,
  payload,
  color,
}: TooltipInjected & { color: string }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <TooltipShell label={formatDayShort(point.date)}>
      <TooltipRow color={color} name="Breaches" value={point.value} />
    </TooltipShell>
  );
}

export function BreachesBar({ data }: { data: TimeseriesPoint[] }) {
  const t = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDayShort}
          tick={{ fill: t.axis, fontSize: 12 }}
          axisLine={{ stroke: t.grid }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          allowDecimals={false}
          width={44}
          tick={{ fill: t.axis, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={<CustomTooltip color={t.series1} />}
          cursor={{ fill: t.grid, opacity: 0.4 }}
        />
        <Bar
          dataKey="value"
          fill={t.series1}
          radius={[4, 4, 0, 0]}
          maxBarSize={22}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
