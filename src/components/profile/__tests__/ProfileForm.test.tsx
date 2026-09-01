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

// The name check is debounced by 500ms and then awaits a request. The default
// 1000ms find timeout leaves little headroom on a loaded CI worker, so every
// wait here is given room rather than relying on the default.
const SETTLE_TIMEOUT_MS = 5000;

const typeName = (name: string) =>
  userEvent.setup().type(screen.getByPlaceholderText('Enter your first name'), name);

describe('ProfileForm name availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('says in words that a name is available, not by a tick alone', async () => {
    mockCheckUsernameAvailability.mockResolvedValue({ available: true });
    renderForm();

    await typeName('Dougie');

    expect(
      await screen.findByText('Name is available', undefined, { timeout: SETTLE_TIMEOUT_MS })
    ).toBeInTheDocument();
  });

  it('leaves the taken case to the field error, so it is announced once', async () => {
    mockCheckUsernameAvailability.mockResolvedValue({ available: false });
    renderForm();

    await typeName('Dougie');

    // The form's own error is the single message; a second live region saying
    // the same thing made a screen reader announce it twice.
    expect(
      await screen.findByText('This name is already taken', undefined, {
        timeout: SETTLE_TIMEOUT_MS,
      })
    ).toBeInTheDocument();
    expect(screen.queryByText('Name is already taken')).not.toBeInTheDocument();
    expect(screen.queryByText('Name is available')).not.toBeInTheDocument();
  });

  it('says nothing before the name is long enough to check', async () => {
    mockCheckUsernameAvailability.mockResolvedValue({ available: true });
    renderForm();

    await typeName('Do');

    await waitFor(() => expect(mockCheckUsernameAvailability).not.toHaveBeenCalled(), {
      timeout: SETTLE_TIMEOUT_MS,
    });
    expect(screen.queryByText('Name is available')).not.toBeInTheDocument();
  });
});
