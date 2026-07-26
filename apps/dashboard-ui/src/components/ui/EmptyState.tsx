import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon.tsx';

export function EmptyState({
  icon = 'search',
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-muted)]">
        <Icon name={icon} size={24} />
      </div>
      <div>
        <p className="font-medium text-[var(--text-h)]">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-[var(--text)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
