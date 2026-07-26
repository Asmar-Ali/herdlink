import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../lib/auth/AuthProvider.tsx';
import { loginRequest } from '../../lib/api/auth.ts';
import { LoginPage } from './LoginPage.tsx';

vi.mock('../../lib/api/auth.ts', () => ({
  loginRequest: vi.fn(),
}));

const mockedLogin = vi.mocked(loginRequest);

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
    vi.clearAllMocks();
  });

  it('pre-fills the shared demo credentials', () => {
    renderLoginPage();

    expect(screen.getByLabelText(/email/i)).toHaveValue('rancher@herdlink.io');
    expect(screen.getByLabelText(/password/i)).toHaveValue('herdlink-demo');
  });

  it('shows validation errors when the fields are cleared', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.clear(screen.getByLabelText(/email/i));
    await user.clear(screen.getByLabelText(/password/i));
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/password must be at least 8 characters/i),
    ).toBeInTheDocument();
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it('rejects an invalid email', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.clear(screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(
      await screen.findByText(/enter a valid email address/i),
    ).toBeInTheDocument();
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it('signs the user in with the pre-filled credentials and stores the session', async () => {
    mockedLogin.mockResolvedValue({
      token: 'signed.jwt.token',
      user: {
        id: 'user-rancher',
        email: 'rancher@herdlink.io',
        name: 'Rancher',
        role: 'Ranch operator',
      },
    });
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem('herdlink.session') ?? 'null'),
      ).toMatchObject({ email: 'rancher@herdlink.io' }),
    );
    expect(mockedLogin).toHaveBeenCalledWith(
      'rancher@herdlink.io',
      'herdlink-demo',
    );
    expect(localStorage.getItem('herdlink.token')).toBe('signed.jwt.token');
  });

  it('surfaces the error message when the backend rejects the credentials', async () => {
    mockedLogin.mockRejectedValue(new Error('Invalid email or password.'));
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(
      await screen.findByText(/invalid email or password\./i),
    ).toBeInTheDocument();
  });
});
