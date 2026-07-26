import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { loginRequest } from '../api/auth.ts';
import {
  AUTH_STORAGE_KEY,
  AUTH_TOKEN_KEY,
  AuthContext,
  type AuthContextValue,
  type AuthUser,
} from './auth-context.ts';

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(AUTH_TOKEN_KEY),
  );

  const login = useCallback(async (email: string, password: string) => {
    const session = await loginRequest(email, password);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session.user));
    localStorage.setItem(AUTH_TOKEN_KEY, session.token);
    setUser(session.user);
    setToken(session.token);
    return session.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
    setToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: user !== null,
      login,
      logout,
    }),
    [user, token, login, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
