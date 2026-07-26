import type { ReactNode } from 'react';

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  className = '',
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`whitespace-nowrap border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] first:rounded-tl-lg last:rounded-tr-lg ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = '',
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`border-b border-[var(--border)] px-4 py-3 align-middle text-[var(--text-h)] ${className}`}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={`transition-colors hover:bg-[var(--surface-2)] ${className}`}
    >
      {children}
    </tr>
  );
}
