import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { DashboardPage, DevicesPage, FencesPage } from './pages/lazy-routes.ts';
import { LoginPage } from './pages/login/LoginPage.tsx';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'devices', element: <DevicesPage /> },
          { path: 'fences', element: <FencesPage /> },
        ],
      },
    ],
  },
]);
