import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  AUTH_STORAGE_KEY,
  AuthContext,
  type AuthContextValue,
  type AuthUser,
} from './auth-context.ts';

function readStored(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function deriveName(email: string): string {
  const handle = email.split('@')[0] ?? 'Operator';
  return handle
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStored());

  const login = useCallback(async (email: string) => {
    // Simulate the network round-trip the real auth call will make.
    await new Promise((resolve) => setTimeout(resolve, 400));
    const nextUser: AuthUser = {
      email,
      name: deriveName(email),
      role: 'Ranch Operator',
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, login, logout }),
    [user, login, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
