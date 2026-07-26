import { useMemo, useState } from 'react';
import { DeviceStatusBadge } from '../../components/ui/Badge.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Card } from '../../components/ui/Card.tsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { Icon } from '../../components/ui/Icon.tsx';
import { Pagination } from '../../components/ui/Pagination.tsx';
import { CenteredSpinner } from '../../components/ui/Spinner.tsx';
import { Table, Td, Th, Tr } from '../../components/ui/Table.tsx';
import { useDeleteDevice, useDevices } from '../../lib/api/hooks.ts';
import { DeviceStatus, type Device } from '../../lib/api/types.ts';
import { formatCoords, relativeTime, titleCase } from '../../lib/format.ts';
import { DeviceFormModal } from './DeviceFormModal.tsx';

const PAGE_SIZE = 8;

function BatteryMeter({ level }: { level: number | null }) {
  if (level === null)
    return <span className="text-[var(--text-muted)]">—</span>;
  const tone =
    level < 20
      ? 'var(--status-critical)'
      : level < 40
        ? 'var(--status-warning)'
        : 'var(--status-good)';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full"
          style={{ width: `${level}%`, background: tone }}
        />
      </div>
      <span className="tabular-nums text-xs text-[var(--text)]">{level}%</span>
    </div>
  );
}

export function DevicesPage() {
  const { data, isLoading } = useDevices({ limit: 100 });
  const deleteDevice = useDeleteDevice();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [deleting, setDeleting] = useState<Device | null>(null);

  const all = useMemo(() => data?.items ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((d) => {
      const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
      const matchesSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.serialNumber.toLowerCase().includes(q) ||
        (d.herdId ?? '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [all, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (device: Device) => {
    setEditing(device);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deleteDevice.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-72">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              <Icon name="search" size={16} />
            </span>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search Name, Serial, Herd…"
              className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] pl-9 pr-3 text-sm text-[var(--text-h)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-border)]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as DeviceStatus | 'ALL');
              setPage(1);
            }}
            className="h-10 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--text-h)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-border)]"
          >
            <option value="ALL">All Statuses</option>
            {Object.values(DeviceStatus).map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={openCreate}>
          <Icon name="plus" size={18} />
          Register Device
        </Button>
      </div>

      <Card padded={false}>
        {isLoading ? (
          <CenteredSpinner label="Loading Devices…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="devices"
            title="No Devices Found"
            description={
              all.length === 0
                ? 'Register your first collar to start tracking the herd.'
                : 'Try adjusting your search or status filter.'
            }
            action={
              all.length === 0 ? (
                <Button onClick={openCreate}>
                  <Icon name="plus" size={18} />
                  Register Device
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Device</Th>
                  <Th>Status</Th>
                  <Th>Herd</Th>
                  <Th>Battery</Th>
                  <Th>Last Position</Th>
                  <Th>Last Seen</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((d) => (
                  <Tr key={d.id}>
                    <Td>
                      <div className="font-medium text-[var(--text-h)]">
                        {d.name}
                      </div>
                      <div className="font-mono text-xs text-[var(--text-muted)]">
                        {d.serialNumber} · {titleCase(d.type)}
                      </div>
                    </Td>
                    <Td>
                      <DeviceStatusBadge status={d.status} />
                    </Td>
                    <Td>
                      {d.herdId ? (
                        <span className="text-sm">{d.herdId}</span>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </Td>
                    <Td>
                      <BatteryMeter level={d.batteryLevel} />
                    </Td>
                    <Td>
                      <span className="font-mono text-xs text-[var(--text)]">
                        {formatCoords(d.lastLatitude, d.lastLongitude)}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-sm text-[var(--text)]">
                        {relativeTime(d.lastSeenAt)}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(d)}
                          aria-label={`Edit ${d.name}`}
                          className="rounded-lg p-1.5 text-[var(--text)] hover:bg-[var(--surface-2)] hover:text-[var(--text-h)]"
                        >
                          <Icon name="edit" size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(d)}
                          aria-label={`Delete ${d.name}`}
                          className="rounded-lg p-1.5 text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--status-critical)_12%,transparent)] hover:text-[var(--status-critical)]"
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pagination
              meta={{
                page: safePage,
                limit: PAGE_SIZE,
                total: filtered.length,
                totalPages,
              }}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <DeviceFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        device={editing}
      />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteDevice.isPending}
        title="Delete Device"
        message={`Remove ${deleting?.name ?? 'this device'} (${deleting?.serialNumber ?? ''}) from the fleet? This cannot be undone.`}
      />
    </div>
  );
}
