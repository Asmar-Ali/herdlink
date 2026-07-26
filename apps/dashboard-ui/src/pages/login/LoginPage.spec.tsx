import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthProvider } from '../../lib/auth/AuthProvider.tsx';
import { LoginPage } from './LoginPage.tsx';

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows validation errors when submitted empty', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/password must be at least 8 characters/i),
    ).toBeInTheDocument();
  });

  it('rejects an invalid email', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/password/i), 'longenoughpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(
      await screen.findByText(/enter a valid email address/i),
    ).toBeInTheDocument();
  });

  it('signs the user in with valid credentials', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'rancher@herdlink.io');
    await user.type(screen.getByLabelText(/password/i), 'longenoughpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem('herdlink.session') ?? 'null'),
      ).toMatchObject({ email: 'rancher@herdlink.io' }),
    );
    expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
  });
});
