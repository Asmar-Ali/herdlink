import type { ReactNode } from 'react';

/** Shared tooltip surface for all charts — tokenised, works in both themes. */
export function TooltipShell({
  label,
  children,
}: {
  label?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs shadow-[var(--shadow)]">
      {label && (
        <div className="mb-1 font-medium text-[var(--text-h)]">{label}</div>
      )}
      {children}
    </div>
  );
}

export function TooltipRow({
  color,
  name,
  value,
}: {
  color: string;
  name: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-[var(--text)]">
      <span
        className="h-2.5 w-2.5 rounded-[3px]"
        style={{ background: color }}
        aria-hidden
      />
      <span className="flex-1">{name}</span>
      <span className="font-medium tabular-nums text-[var(--text-h)]">
        {value}
      </span>
    </div>
  );
}
