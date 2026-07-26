import { Icon } from '../ui/Icon.tsx';

export function Header({
  title,
  subtitle,
  onOpenMenu,
}: {
  title: string;
  subtitle?: string;
  onOpenMenu: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_85%,transparent)] px-4 backdrop-blur md:px-8">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open Navigation"
        className="-ml-1 rounded-lg p-2 text-[var(--text)] hover:bg-[var(--surface-2)] md:hidden"
      >
        <Icon name="menu" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold text-[var(--text-h)]">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs text-[var(--text)]">{subtitle}</p>
        )}
      </div>

      <div className="hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text)] sm:flex">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--status-good)] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--status-good)]" />
        </span>
        Live Telemetry
      </div>
    </header>
  );
}
