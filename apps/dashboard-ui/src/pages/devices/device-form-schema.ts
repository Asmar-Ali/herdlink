import { z } from 'zod';
import { DeviceStatus, DeviceType } from '../../lib/api/types.ts';

/** Mirrors device-service's CreateDeviceDto validation constraints. */
export const deviceFormSchema = z.object({
  serialNumber: z
    .string()
    .trim()
    .min(1, 'Serial number is required')
    .max(64, 'Max 64 characters'),
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(120, 'Max 120 characters'),
  type: z.enum(DeviceType),
  status: z.enum(DeviceStatus),
  herdId: z.string().trim().max(128, 'Max 128 characters').optional(),
  // Kept as a string in the form (coerced to number | null on submit) so the
  // resolver's input and output types match — avoids RHF generic friction.
  batteryLevel: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || (/^\d+$/.test(v) && Number(v) >= 0 && Number(v) <= 100),
      'Enter a whole number from 0 to 100',
    ),
});

export type DeviceFormValues = z.infer<typeof deviceFormSchema>;
