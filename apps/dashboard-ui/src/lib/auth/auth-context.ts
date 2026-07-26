import { createContext, use } from 'react';

/*
 * Auth context + hook (no components here, so Fast Refresh stays happy). The
 * provider lives in AuthProvider.tsx. Until realtime-gateway's JWT auth endpoint
 * exists (PRD M3), the session is a fake held in localStorage — but this public
 * surface is what the real implementation will expose, so screens won't change.
 */

export interface AuthUser {
  email: string;
  name: string;
  role: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string) => Promise<AuthUser>;
  logout: () => void;
}

export const AUTH_STORAGE_KEY = 'herdlink.session';

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
