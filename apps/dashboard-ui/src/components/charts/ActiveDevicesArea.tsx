import {
  Area,
  AreaChart,
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
      <TooltipRow color={color} name="Active devices" value={point.value} />
    </TooltipShell>
  );
}

export function ActiveDevicesArea({ data }: { data: TimeseriesPoint[] }) {
  const t = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
      >
        <defs>
          <linearGradient id="activeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t.series1} stopOpacity={0.28} />
            <stop offset="100%" stopColor={t.series1} stopOpacity={0.02} />
          </linearGradient>
        </defs>
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
          cursor={{ stroke: t.axis, strokeDasharray: '4 4' }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={t.series1}
          strokeWidth={2}
          fill="url(#activeFill)"
          dot={false}
          activeDot={{
            r: 4,
            fill: t.series1,
            stroke: t.surface,
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
