import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { session } from '@/lib/auth/session';

import { LoginPage } from './LoginPage';

function renderLogin() {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/', element: <p>Dashboard</p> },
    ],
    { initialEntries: ['/login'] },
  );
  render(
    <MantineProvider>
      <RouterProvider router={router} />
    </MantineProvider>,
  );
  return router;
}

describe('LoginPage', () => {
  it('validates before calling the API', async () => {
    const login = vi.spyOn(session, 'login');
    renderLogin();

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('signs in and navigates to the dashboard', async () => {
    const login = vi.spyOn(session, 'login').mockResolvedValue({
      id: 'u1',
      email: 'farmer@example.com',
      fullName: 'Farmer One',
      roles: ['FARM_MANAGER'],
      enabled: true,
      lastLoginAt: null,
      createdAt: '2026-09-01T00:00:00Z',
    });
    renderLogin();

    await userEvent.type(
      screen.getByLabelText(/email/i, { selector: 'input' }),
      'farmer@example.com',
    );
    await userEvent.type(
      screen.getByLabelText(/password/i, { selector: 'input' }),
      'Correct-Horse-Battery',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(login).toHaveBeenCalledWith({
      email: 'farmer@example.com',
      password: 'Correct-Horse-Battery',
    });
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });
});
