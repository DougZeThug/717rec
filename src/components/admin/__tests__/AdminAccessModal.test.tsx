import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AdminAccessModal } from '../AdminAccessModal';

const { mockUseAuth, mockNavigate } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('react-router', () => ({ useNavigate: () => mockNavigate }));

describe('AdminAccessModal', () => {
  it('asks a signed-out visitor to sign in and sends them back to /admin after', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const user = userEvent.setup();

    render(<AdminAccessModal isOpen />);

    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(screen.getByText('You must be logged in to access this area.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign in to continue' }));
    expect(mockNavigate).toHaveBeenCalledWith('/auth', { state: { returnTo: '/admin' } });
  });

  it('tells a signed-in non-admin they lack permission and offers a request or a way home', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    const onRequestAccess = vi.fn();
    const user = userEvent.setup();

    render(<AdminAccessModal isOpen onRequestAccess={onRequestAccess} />);

    expect(
      screen.getByText("You don't have permission to access the admin panel.")
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Request Access' }));
    expect(onRequestAccess).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Back to Home' }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('stays open when the visitor tries to close it with Escape', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const user = userEvent.setup();

    render(<AdminAccessModal isOpen />);

    await user.keyboard('{Escape}');

    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in to continue' })).toBeInTheDocument();
  });
});
