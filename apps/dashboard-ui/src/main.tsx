import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import { Toaster } from './components/ui/sonner.tsx';
import { AuthProvider } from './lib/auth/AuthProvider.tsx';
import { queryClient } from './lib/query-client.ts';
import { router } from './router.tsx';

// Keep the shadcn `.dark` class following the OS theme after the initial
// pre-paint sync in index.html (live updates without a reload).
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
darkQuery.addEventListener('change', (e) => {
  document.documentElement.classList.toggle('dark', e.matches);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
        />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
