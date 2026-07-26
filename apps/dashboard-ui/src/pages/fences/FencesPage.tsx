import { useMemo, useState } from 'react';
import { Badge, SeverityBadge } from '../../components/ui/Badge.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Card } from '../../components/ui/Card.tsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { Icon } from '../../components/ui/Icon.tsx';
import { Pagination } from '../../components/ui/Pagination.tsx';
import { CenteredSpinner } from '../../components/ui/Spinner.tsx';
import { Table, Td, Th, Tr } from '../../components/ui/Table.tsx';
import { useDeleteFence, useFences } from '../../lib/api/hooks.ts';
import { GeofenceType, type Fence } from '../../lib/api/types.ts';
import { titleCase } from '../../lib/format.ts';
import { FenceFormModal } from './FenceFormModal.tsx';

const PAGE_SIZE = 8;

export function FencesPage() {
  const { data, isLoading } = useFences({ limit: 100 });
  const deleteFence = useDeleteFence();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<GeofenceType | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Fence | null>(null);
  const [deleting, setDeleting] = useState<Fence | null>(null);

  const all = useMemo(() => data?.items ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((f) => {
      const matchesType = typeFilter === 'ALL' || f.type === typeFilter;
      const matchesSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        (f.description ?? '').toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [all, search, typeFilter]);

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
  const openEdit = (fence: Fence) => {
    setEditing(fence);
    setFormOpen(true);
  };
  const confirmDelete = () => {
    if (!deleting) return;
    deleteFence.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
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
              placeholder="Search fences…"
              className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] pl-9 pr-3 text-sm text-[var(--text-h)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-border)]"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as GeofenceType | 'ALL');
              setPage(1);
            }}
            className="h-10 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--text-h)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-border)]"
          >
            <option value="ALL">All types</option>
            {Object.values(GeofenceType).map((t) => (
              <option key={t} value={t}>
                {titleCase(t)}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={openCreate}>
          <Icon name="plus" size={18} />
          Create geofence
        </Button>
      </div>

      <Card padded={false}>
        {isLoading ? (
          <CenteredSpinner label="Loading fences…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="fences"
            title="No geofences found"
            description={
              all.length === 0
                ? 'Create your first boundary to start alerting on breaches.'
                : 'Try adjusting your search or type filter.'
            }
            action={
              all.length === 0 ? (
                <Button onClick={openCreate}>
                  <Icon name="plus" size={18} />
                  Create geofence
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Fence</Th>
                  <Th>Type</Th>
                  <Th>Severity</Th>
                  <Th>Breach</Th>
                  <Th>Applies to</Th>
                  <Th>State</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((f) => (
                  <Tr key={f.id}>
                    <Td>
                      <div className="font-medium text-[var(--text-h)]">
                        {f.name}
                      </div>
                      {f.description && (
                        <div className="max-w-xs truncate text-xs text-[var(--text-muted)]">
                          {f.description}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <Badge
                        tone={
                          f.type === GeofenceType.EXCLUSION
                            ? 'critical'
                            : 'info'
                        }
                      >
                        {titleCase(f.type)}
                      </Badge>
                    </Td>
                    <Td>
                      <SeverityBadge severity={f.severity} />
                    </Td>
                    <Td>
                      <span className="text-sm text-[var(--text)]">
                        {titleCase(f.breachDirection)}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-sm text-[var(--text)]">
                        {f.herdIds.length === 0
                          ? 'All devices'
                          : f.herdIds.join(', ')}
                      </span>
                    </Td>
                    <Td>
                      <Badge tone={f.active ? 'good' : 'neutral'} dot>
                        {f.active ? 'Active' : 'Disabled'}
                      </Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(f)}
                          aria-label={`Edit ${f.name}`}
                          className="rounded-lg p-1.5 text-[var(--text)] hover:bg-[var(--surface-2)] hover:text-[var(--text-h)]"
                        >
                          <Icon name="edit" size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(f)}
                          aria-label={`Delete ${f.name}`}
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

      <FenceFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        fence={editing}
      />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteFence.isPending}
        title="Delete geofence"
        message={`Delete "${deleting?.name ?? 'this fence'}"? Devices will no longer be alerted on this boundary.`}
      />
    </div>
  );
}
