import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../lib/auth/auth-context.ts';
import { Icon } from '../ui/Icon.tsx';

/**
 * Fixed bottom-right settings control (per the portal spec). Opens a popover
 * above itself with the signed-in user's profile and a logout action.
 */
export function SettingsMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = () => {
    setOpen(false);
    logout();
    toast.success('Signed out', { description: 'See you next time.' });
    navigate('/login', { replace: true });
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3"
    >
      {open && (
        <div
          role="menu"
          className="w-64 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]"
        >
          <div className="flex items-center gap-3 border-b border-[var(--border)] p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-bg)] text-sm font-semibold text-[var(--accent)]">
              {initials}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[var(--text-h)]">
                {user?.name}
              </div>
              <div className="truncate text-xs text-[var(--text)]">
                {user?.email}
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                {user?.role}
              </div>
            </div>
          </div>
          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                toast('Profile settings are coming soon.');
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] hover:text-[var(--text-h)]"
            >
              <Icon name="user" size={18} />
              Profile
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--status-critical)] hover:bg-[color-mix(in_srgb,var(--status-critical)_10%,transparent)]"
            >
              <Icon name="logout" size={18} />
              Log out
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        aria-label="Settings and profile"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-h)] shadow-[var(--shadow)] transition-colors hover:bg-[var(--surface-2)] ${
          open ? 'ring-2 ring-[var(--accent-border)]' : ''
        }`}
      >
        <Icon name="settings" size={22} />
      </button>
    </div>
  );
}
