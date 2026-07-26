import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from '../ui/Icon.tsx';
import { SettingsMenu } from './SettingsMenu.tsx';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/devices', label: 'Devices', icon: 'devices' },
  { to: '/fences', label: 'Fences', icon: 'fences' },
];

export function Sidebar({
  mobileOpen,
  onNavigate,
}: {
  mobileOpen: boolean;
  onNavigate: () => void;
}) {
  return (
    <>
      {/* Mobile scrim */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onNavigate}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] transition-transform md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-[var(--border)] px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-fg)]">
            <Icon name="shield" size={18} />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-[var(--text-h)]">
              HerdLink
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              Fleet back-office
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                    : 'text-[var(--text)] hover:bg-[var(--surface-2)] hover:text-[var(--text-h)]'
                }`
              }
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-3 border-t border-[var(--border)] p-4">
          <SettingsMenu />
          <div className="text-[11px] text-[var(--text-muted)]">
            v0.0.0 · milestone M2
          </div>
        </div>
      </aside>
    </>
  );
}
