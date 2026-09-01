import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCheckUsernameAvailability = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/useToast', () => ({ toast: vi.fn() }));

vi.mock('@/services/profile/ProfileService', async () => {
  const actual = await vi.importActual<typeof import('@/services/profile/ProfileService')>(
    '@/services/profile/ProfileService'
  );
  return {
    ...actual,
    checkUsernameAvailability: (...args: unknown[]) => mockCheckUsernameAvailability(...args),
    updateProfile: vi.fn().mockResolvedValue(undefined),
  };
});

import ProfileForm from '../ProfileForm';

const renderForm = () =>
  render(<ProfileForm initialUsername="" initialFullName="" onProfileUpdated={vi.fn()} />);

describe('ProfileForm name availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('says in words that a name is available, not by a tick alone', async () => {
    mockCheckUsernameAvailability.mockResolvedValue({ available: true });
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByPlaceholderText('Enter your first name'), 'Dougie');

    expect(await screen.findByText('Name is available')).toBeInTheDocument();
  });

  it('says in words that a name is taken', async () => {
    mockCheckUsernameAvailability.mockResolvedValue({ available: false });
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByPlaceholderText('Enter your first name'), 'Dougie');

    expect(await screen.findByText('Name is already taken')).toBeInTheDocument();
  });

  it('says nothing before the name is long enough to check', async () => {
    mockCheckUsernameAvailability.mockResolvedValue({ available: true });
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByPlaceholderText('Enter your first name'), 'Do');

    await waitFor(() => expect(mockCheckUsernameAvailability).not.toHaveBeenCalled());
    expect(screen.queryByText('Name is available')).not.toBeInTheDocument();
    expect(screen.queryByText('Name is already taken')).not.toBeInTheDocument();
  });
});
