import { Card } from './Card.tsx';
import { Icon, type IconName } from './Icon.tsx';

type Accent = 'accent' | 'good' | 'warning' | 'critical';

const accentText: Record<Accent, string> = {
  accent: 'text-[var(--accent)]',
  good: 'text-[var(--status-good)]',
  warning: 'text-[var(--status-warning)]',
  critical: 'text-[var(--status-critical)]',
};
const accentBg: Record<Accent, string> = {
  accent: 'bg-[var(--accent-bg)]',
  good: 'bg-[color-mix(in_srgb,var(--status-good)_14%,transparent)]',
  warning: 'bg-[color-mix(in_srgb,var(--status-warning)_16%,transparent)]',
  critical: 'bg-[color-mix(in_srgb,var(--status-critical)_14%,transparent)]',
};

export function StatTile({
  label,
  value,
  icon,
  accent = 'accent',
  delta,
  hint,
}: {
  label: string;
  value: string | number;
  icon: IconName;
  accent?: Accent;
  delta?: number;
  hint?: string;
}) {
  const showDelta = typeof delta === 'number' && delta !== 0;
  const deltaUp = (delta ?? 0) > 0;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-[var(--text)]">{label}</span>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentBg[accent]} ${accentText[accent]}`}
        >
          <Icon name={icon} size={18} />
        </span>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-3xl font-semibold tracking-tight text-[var(--text-h)]">
          {value}
        </span>
        {showDelta && (
          <span
            className={`mb-1 inline-flex items-center gap-0.5 text-xs font-medium ${
              deltaUp
                ? 'text-[var(--status-good)]'
                : 'text-[var(--status-critical)]'
            }`}
          >
            {deltaUp ? '▲' : '▼'} {Math.abs(delta as number)}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>}
    </Card>
  );
}
