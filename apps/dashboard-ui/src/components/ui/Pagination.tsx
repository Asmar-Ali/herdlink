import type { PaginationMeta } from '../../lib/api/types.ts';
import { Icon } from './Icon.tsx';

export function Pagination({
  meta,
  onPageChange,
}: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  const { page, limit, total, totalPages } = meta;
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between gap-4 border-t border-[var(--border)] px-4 py-3 text-sm text-[var(--text)]">
      <span className="tabular-nums">
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="rounded-lg border border-[var(--border-strong)] p-1.5 text-[var(--text-h)] hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="chevron-left" size={16} />
        </button>
        <span className="px-2 tabular-nums">
          {page} / {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="rounded-lg border border-[var(--border-strong)] p-1.5 text-[var(--text-h)] hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="chevron-right" size={16} />
        </button>
      </div>
    </div>
  );
}
