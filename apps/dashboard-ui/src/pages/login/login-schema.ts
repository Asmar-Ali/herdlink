import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/*
 * There is no signup flow yet: every operator signs in with this shared demo
 * account, which device-service validates. The login form is pre-filled with
 * these values so a click-through "just works". Keep in sync with the backend
 * (apps/device-service/src/auth/auth.service.ts).
 */
export const demoCredentials: LoginFormValues = {
  email: 'rancher@herdlink.io',
  password: 'herdlink-demo',
};
