import { createContext, use } from 'react';

/*
 * Auth context + hook (no components here, so Fast Refresh stays happy). The
 * provider lives in AuthProvider.tsx. `login` posts credentials to
 * device-service's `POST /api/v1/auth/login`, which returns a signed JWT plus
 * the operator; both are persisted in localStorage.
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

export const AUTH_STORAGE_KEY = 'herdlink.session';
export const AUTH_TOKEN_KEY = 'herdlink.token';

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
