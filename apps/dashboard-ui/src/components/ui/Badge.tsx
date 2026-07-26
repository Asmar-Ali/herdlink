import type { ReactNode } from 'react';
import {
  DeviceStatus,
  FenceSeverity,
  type FenceSeverity as FenceSeverityT,
} from '../../lib/api/types.ts';
import { titleCase } from '../../lib/format.ts';

type Tone = 'good' | 'warning' | 'serious' | 'critical' | 'neutral' | 'info';

const toneStyles: Record<Tone, string> = {
  good: 'text-[var(--status-good)] bg-[color-mix(in_srgb,var(--status-good)_14%,transparent)]',
  warning:
    'text-[var(--status-warning)] bg-[color-mix(in_srgb,var(--status-warning)_16%,transparent)]',
  serious:
    'text-[var(--status-serious)] bg-[color-mix(in_srgb,var(--status-serious)_16%,transparent)]',
  critical:
    'text-[var(--status-critical)] bg-[color-mix(in_srgb,var(--status-critical)_14%,transparent)]',
  neutral: 'text-[var(--text)] bg-[var(--surface-2)]',
  info: 'text-[var(--series-1)] bg-[color-mix(in_srgb,var(--series-1)_14%,transparent)]',
};

export function Badge({
  tone = 'neutral',
  children,
  dot = false,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${toneStyles[tone]}`}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      )}
      {children}
    </span>
  );
}

const statusTone: Record<DeviceStatus, Tone> = {
  [DeviceStatus.ACTIVE]: 'good',
  [DeviceStatus.INACTIVE]: 'neutral',
  [DeviceStatus.LOST]: 'critical',
  [DeviceStatus.DECOMMISSIONED]: 'neutral',
};

export function DeviceStatusBadge({ status }: { status: DeviceStatus }) {
  return (
    <Badge tone={statusTone[status]} dot>
      {titleCase(status)}
    </Badge>
  );
}

const severityTone: Record<FenceSeverityT, Tone> = {
  [FenceSeverity.LOW]: 'neutral',
  [FenceSeverity.MEDIUM]: 'warning',
  [FenceSeverity.HIGH]: 'serious',
  [FenceSeverity.CRITICAL]: 'critical',
};

export function SeverityBadge({ severity }: { severity: FenceSeverityT }) {
  return <Badge tone={severityTone[severity]}>{titleCase(severity)}</Badge>;
}
