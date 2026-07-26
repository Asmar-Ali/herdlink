import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth/auth-context.ts';

/**
 * Gate for the back-office shell. Unauthenticated visitors are bounced to
 * /login, preserving where they were headed so login can send them back.
 */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
