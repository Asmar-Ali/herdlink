import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as api from './client.ts';
import type {
  CreateDeviceInput,
  CreateFenceInput,
  PaginationQuery,
  UpdateDeviceInput,
  UpdateFenceInput,
} from './types.ts';

export const queryKeys = {
  devices: (query: PaginationQuery = {}) => ['devices', query] as const,
  fences: (query: PaginationQuery = {}) => ['fences', query] as const,
  dashboardStats: () => ['dashboard-stats'] as const,
};

/* ── Dashboard ────────────────────────────────────────────────────────────── */

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboardStats(),
    queryFn: api.getDashboardStats,
  });
}

/* ── Devices ──────────────────────────────────────────────────────────────── */

export function useDevices(query: PaginationQuery = {}) {
  return useQuery({
    queryKey: queryKeys.devices(query),
    queryFn: () => api.listDevices(query),
  });
}

function useInvalidateDeviceViews() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['devices'] });
    qc.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
  };
}

export function useCreateDevice() {
  const invalidate = useInvalidateDeviceViews();
  return useMutation({
    mutationFn: (input: CreateDeviceInput) => api.createDevice(input),
    onSuccess: (device) => {
      invalidate();
      toast.success('Device registered', {
        description: `${device.name} (${device.serialNumber}) was added.`,
      });
    },
    onError: (err) =>
      toast.error('Could not register device', {
        description: err instanceof Error ? err.message : undefined,
      }),
  });
}

export function useUpdateDevice() {
  const invalidate = useInvalidateDeviceViews();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDeviceInput }) =>
      api.updateDevice(id, input),
    onSuccess: (device) => {
      invalidate();
      toast.success('Device updated', { description: device.name });
    },
    onError: (err) =>
      toast.error('Could not update device', {
        description: err instanceof Error ? err.message : undefined,
      }),
  });
}

export function useDeleteDevice() {
  const invalidate = useInvalidateDeviceViews();
  return useMutation({
    mutationFn: (id: string) => api.deleteDevice(id),
    onSuccess: (_, id) => {
      invalidate();
      toast.success('Device removed', { description: id });
    },
    onError: (err) =>
      toast.error('Could not remove device', {
        description: err instanceof Error ? err.message : undefined,
      }),
  });
}

/* ── Fences ───────────────────────────────────────────────────────────────── */

export function useFences(query: PaginationQuery = {}) {
  return useQuery({
    queryKey: queryKeys.fences(query),
    queryFn: () => api.listFences(query),
  });
}

function useInvalidateFenceViews() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['fences'] });
    qc.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
  };
}

export function useCreateFence() {
  const invalidate = useInvalidateFenceViews();
  return useMutation({
    mutationFn: (input: CreateFenceInput) => api.createFence(input),
    onSuccess: (fence) => {
      invalidate();
      toast.success('Geofence created', { description: fence.name });
    },
    onError: (err) =>
      toast.error('Could not create geofence', {
        description: err instanceof Error ? err.message : undefined,
      }),
  });
}

export function useUpdateFence() {
  const invalidate = useInvalidateFenceViews();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFenceInput }) =>
      api.updateFence(id, input),
    onSuccess: (fence) => {
      invalidate();
      toast.success('Geofence updated', { description: fence.name });
    },
    onError: (err) =>
      toast.error('Could not update geofence', {
        description: err instanceof Error ? err.message : undefined,
      }),
  });
}

export function useDeleteFence() {
  const invalidate = useInvalidateFenceViews();
  return useMutation({
    mutationFn: (id: string) => api.deleteFence(id),
    onSuccess: () => {
      invalidate();
      toast.success('Geofence deleted');
    },
    onError: (err) =>
      toast.error('Could not delete geofence', {
        description: err instanceof Error ? err.message : undefined,
      }),
  });
}
