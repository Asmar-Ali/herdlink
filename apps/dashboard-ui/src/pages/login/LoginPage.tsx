import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../lib/auth/auth-context.ts';
import { loginSchema, type LoginFormValues } from './login-schema.ts';

interface LocationState {
  from?: { pathname?: string };
}

export function LoginPage() {
  const [authError, setAuthError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from?.pathname ?? '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setAuthError(null);
    try {
      // TODO(M3): swap AuthProvider.login for realtime-gateway's JWT endpoint — see docs/PRD.md#8-milestones.
      const user = await login(values.email);
      toast.success(`Welcome back, ${user.name}`);
      navigate(from, { replace: true });
    } catch {
      setAuthError('Unable to sign in. Please try again.');
    }
  };

  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--bg)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm space-y-8 rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow)] sm:p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-h)]">
            Sign in to HerdLink
          </h1>
          <p className="mt-2 text-sm text-[var(--text)]">
            Monitor your fleet in real time.
          </p>
        </div>

        {authError && (
          <div
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {authError}
          </div>
        )}

        <form
          className="space-y-5"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[var(--text-h)]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className="mt-1.5 block w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text-h)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-border)]"
              {...register('email')}
            />
            {errors.email && (
              <p
                id="email-error"
                className="mt-1.5 text-sm text-red-600 dark:text-red-400"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[var(--text-h)]"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className="mt-1.5 block w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text-h)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-border)]"
              {...register('password')}
            />
            {errors.password && (
              <p
                id="password-error"
                className="mt-1.5 text-sm text-red-600 dark:text-red-400"
              >
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full justify-center rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-[var(--text-muted)]">
          Demo build — any valid email and an 8+ character password will sign
          you in.
        </p>
      </div>
    </main>
  );
}
