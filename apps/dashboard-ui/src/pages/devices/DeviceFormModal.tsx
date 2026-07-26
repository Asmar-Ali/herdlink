import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/Button.tsx';
import { Field, Select, TextInput } from '../../components/ui/Field.tsx';
import { Modal } from '../../components/ui/Modal.tsx';
import { useCreateDevice, useUpdateDevice } from '../../lib/api/hooks.ts';
import { DeviceStatus, DeviceType, type Device } from '../../lib/api/types.ts';
import { titleCase } from '../../lib/format.ts';
import {
  deviceFormSchema,
  type DeviceFormValues,
} from './device-form-schema.ts';

export function DeviceFormModal({
  open,
  onClose,
  device,
}: {
  open: boolean;
  onClose: () => void;
  device?: Device | null;
}) {
  const isEdit = Boolean(device);
  const createDevice = useCreateDevice();
  const updateDevice = useUpdateDevice();
  const pending = createDevice.isPending || updateDevice.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceFormSchema),
    defaultValues: {
      serialNumber: '',
      name: '',
      type: DeviceType.COLLAR_V1,
      status: DeviceStatus.INACTIVE,
      herdId: '',
      batteryLevel: '',
    },
  });

  // Repopulate whenever the target device (or open state) changes.
  useEffect(() => {
    if (!open) return;
    reset({
      serialNumber: device?.serialNumber ?? '',
      name: device?.name ?? '',
      type: device?.type ?? DeviceType.COLLAR_V1,
      status: device?.status ?? DeviceStatus.INACTIVE,
      herdId: device?.herdId ?? '',
      batteryLevel:
        device?.batteryLevel === null || device?.batteryLevel === undefined
          ? ''
          : String(device.batteryLevel),
    });
  }, [open, device, reset]);

  const onSubmit = (values: DeviceFormValues) => {
    const battery = values.batteryLevel?.trim();
    const payload = {
      serialNumber: values.serialNumber,
      name: values.name,
      type: values.type,
      status: values.status,
      herdId: values.herdId ? values.herdId : null,
      batteryLevel: battery ? Number(battery) : null,
    };

    const done = () => onClose();
    if (isEdit && device) {
      updateDevice.mutate(
        { id: device.id, input: payload },
        { onSuccess: done },
      );
    } else {
      createDevice.mutate(payload, { onSuccess: done });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Device' : 'Register Device'}
      description={
        isEdit
          ? 'Update this collar’s details.'
          : 'Add a new collar to the fleet.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="device-form" disabled={pending}>
            {pending ? 'Saving…' : isEdit ? 'Save Changes' : 'Register Device'}
          </Button>
        </>
      }
    >
      <form
        id="device-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <Field
          label="Serial Number"
          htmlFor="serialNumber"
          error={errors.serialNumber?.message}
        >
          <TextInput
            id="serialNumber"
            placeholder="HL-XXXXXX"
            disabled={isEdit}
            {...register('serialNumber')}
          />
        </Field>

        <Field label="Name" htmlFor="name" error={errors.name?.message}>
          <TextInput
            id="name"
            placeholder="Collar #142"
            {...register('name')}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Type" htmlFor="type">
            <Select id="type" {...register('type')}>
              {Object.values(DeviceType).map((t) => (
                <option key={t} value={t}>
                  {titleCase(t)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="status">
            <Select id="status" {...register('status')}>
              {Object.values(DeviceStatus).map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Herd ID" htmlFor="herdId" hint="Optional">
            <TextInput
              id="herdId"
              placeholder="herd-north"
              {...register('herdId')}
            />
          </Field>
          <Field
            label="Battery %"
            htmlFor="batteryLevel"
            error={errors.batteryLevel?.message}
            hint="0–100, optional"
          >
            <TextInput
              id="batteryLevel"
              type="number"
              min={0}
              max={100}
              {...register('batteryLevel')}
            />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
