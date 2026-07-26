export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className="inline-block animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)]"
      style={{ width: size, height: size }}
    />
  );
}

export function CenteredSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-[var(--text)]">
      <Spinner size={28} />
      {label && <span>{label}</span>}
    </div>
  );
}
