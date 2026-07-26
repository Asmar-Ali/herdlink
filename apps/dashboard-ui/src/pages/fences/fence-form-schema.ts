import { z } from 'zod';
import {
  BreachDirection,
  FenceSeverity,
  GeofenceType,
} from '../../lib/api/types.ts';

/** Mirrors device-service's CreateFenceDto (geometry is drawn on the map, not typed here). */
export const fenceFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(120, 'Max 120 characters'),
  description: z.string().trim().max(500, 'Max 500 characters').optional(),
  type: z.enum(GeofenceType),
  breachDirection: z.enum(BreachDirection),
  severity: z.enum(FenceSeverity),
  herdIds: z.string().trim().optional(), // comma-separated in the form
  // String in the form (coerced on submit) to keep resolver input/output aligned.
  alertCooldownSeconds: z
    .string()
    .trim()
    .refine(
      (v) => /^\d+$/.test(v) && Number(v) >= 0 && Number(v) <= 86400,
      'Enter seconds from 0 to 86400 (24h)',
    ),
  active: z.boolean(),
});

export type FenceFormValues = z.infer<typeof fenceFormSchema>;
