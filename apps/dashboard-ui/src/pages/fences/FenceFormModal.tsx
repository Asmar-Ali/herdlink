import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/Button.tsx';
import {
  Field,
  Select,
  TextInput,
  Textarea,
} from '../../components/ui/Field.tsx';
import { Modal } from '../../components/ui/Modal.tsx';
import { useCreateFence, useUpdateFence } from '../../lib/api/hooks.ts';
import {
  BreachDirection,
  FenceSeverity,
  GeofenceType,
  type Fence,
} from '../../lib/api/types.ts';
import { titleCase } from '../../lib/format.ts';
import { fenceFormSchema, type FenceFormValues } from './fence-form-schema.ts';

export function FenceFormModal({
  open,
  onClose,
  fence,
}: {
  open: boolean;
  onClose: () => void;
  fence?: Fence | null;
}) {
  const isEdit = Boolean(fence);
  const createFence = useCreateFence();
  const updateFence = useUpdateFence();
  const pending = createFence.isPending || updateFence.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FenceFormValues>({
    resolver: zodResolver(fenceFormSchema),
    defaultValues: {
      name: '',
      description: '',
      type: GeofenceType.INCLUSION,
      breachDirection: BreachDirection.BOTH,
      severity: FenceSeverity.MEDIUM,
      herdIds: '',
      alertCooldownSeconds: '300',
      active: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: fence?.name ?? '',
      description: fence?.description ?? '',
      type: fence?.type ?? GeofenceType.INCLUSION,
      breachDirection: fence?.breachDirection ?? BreachDirection.BOTH,
      severity: fence?.severity ?? FenceSeverity.MEDIUM,
      herdIds: fence?.herdIds.join(', ') ?? '',
      alertCooldownSeconds: String(fence?.alertCooldownSeconds ?? 300),
      active: fence?.active ?? true,
    });
  }, [open, fence, reset]);

  const onSubmit = (values: FenceFormValues) => {
    const payload = {
      name: values.name,
      description: values.description || undefined,
      type: values.type,
      breachDirection: values.breachDirection,
      severity: values.severity,
      active: values.active,
      alertCooldownSeconds: Number(values.alertCooldownSeconds),
      herdIds: values.herdIds
        ? values.herdIds
            .split(',')
            .map((h) => h.trim())
            .filter(Boolean)
        : [],
    };

    const done = () => onClose();
    if (isEdit && fence) {
      updateFence.mutate({ id: fence.id, input: payload }, { onSuccess: done });
    } else {
      createFence.mutate(payload, { onSuccess: done });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Geofence' : 'Create Geofence'}
      description={
        isEdit
          ? 'Update this boundary’s alert rules.'
          : 'Define a new boundary. Draw its shape on the map after saving.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="fence-form" disabled={pending}>
            {pending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Geofence'}
          </Button>
        </>
      }
    >
      <form
        id="fence-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <Field label="Name" htmlFor="name" error={errors.name?.message}>
          <TextInput
            id="name"
            placeholder="North Paddock"
            {...register('name')}
          />
        </Field>

        <Field
          label="Description"
          htmlFor="description"
          error={errors.description?.message}
          hint="Optional"
        >
          <Textarea
            id="description"
            rows={2}
            placeholder="Primary grazing enclosure…"
            {...register('description')}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Type" htmlFor="type">
            <Select id="type" {...register('type')}>
              {Object.values(GeofenceType).map((t) => (
                <option key={t} value={t}>
                  {titleCase(t)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Severity" htmlFor="severity">
            <Select id="severity" {...register('severity')}>
              {Object.values(FenceSeverity).map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Breach Direction" htmlFor="breachDirection">
            <Select id="breachDirection" {...register('breachDirection')}>
              {Object.values(BreachDirection).map((b) => (
                <option key={b} value={b}>
                  {titleCase(b)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Alert Cooldown (s)"
            htmlFor="alertCooldownSeconds"
            error={errors.alertCooldownSeconds?.message}
          >
            <TextInput
              id="alertCooldownSeconds"
              type="number"
              min={0}
              {...register('alertCooldownSeconds')}
            />
          </Field>
        </div>

        <Field
          label="Herd IDs"
          htmlFor="herdIds"
          hint="Comma-separated. Empty = applies to all devices."
        >
          <TextInput
            id="herdIds"
            placeholder="herd-north, herd-south"
            {...register('herdIds')}
          />
        </Field>

        <label className="flex items-center gap-2.5 text-sm text-[var(--text-h)]">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
            {...register('active')}
          />
          Active — evaluate this fence for breaches
        </label>
      </form>
    </Modal>
  );
}
