import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMutateAsync = vi.fn();
let mockUser: { email?: string; user_metadata?: { full_name?: string; name?: string } } | null =
  null;
let mockMembership: { team?: { name: string } } | null = null;

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('@/hooks/useTeamMembership', () => ({
  useTeamMembership: () => ({ membership: mockMembership }),
}));

vi.mock('@/hooks/contact/useContactRequests', () => ({
  useSubmitContactRequest: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

vi.mock('@/hooks/useToast', () => ({
  toast: vi.fn(),
}));

import ContactPanel from '../ContactPanel';

describe('ContactPanel', () => {
  beforeEach(() => {
    mockUser = null;
    mockMembership = null;
    mockMutateAsync.mockReset();
    mockMutateAsync.mockResolvedValue(undefined);
  });

  it('derives verified contact fields when signed-in data arrives after initial render', () => {
    const { rerender } = render(<ContactPanel />);

    expect(screen.getByLabelText(/your name/i)).toHaveValue('');

    mockUser = { email: 'captain@example.com', user_metadata: { full_name: 'Casey Captain' } };
    mockMembership = { team: { name: 'Rail Riders' } };
    rerender(<ContactPanel />);

    expect(screen.getByLabelText(/your name/i)).toHaveValue('Casey Captain');
    expect(screen.getByLabelText(/team name/i)).toHaveValue('Rail Riders');
    expect(screen.getByLabelText(/contact \(email or phone\)/i)).toHaveValue('captain@example.com');
  });

  it('submits derived verified values without copying them through an effect', async () => {
    mockUser = { email: 'captain@example.com', user_metadata: { full_name: 'Casey Captain' } };
    mockMembership = { team: { name: 'Rail Riders' } };

    render(<ContactPanel />);
    await userEvent.type(screen.getByLabelText(/message/i), 'Please update our score.');
    await userEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        submitter_name: 'Casey Captain',
        submitter_team: 'Rail Riders',
        submitter_contact: 'captain@example.com',
        message: 'Please update our score.',
      })
    );
  });

  it('preserves user-typed name when auth resolves and does not show Verified badge when value differs', async () => {
    const { rerender } = render(<ContactPanel />);

    // User types their name while user is null (auth loading/unsigned-in)
    await userEvent.type(screen.getByLabelText(/your name/i), 'Typed Name');

    const nameInput = screen.getByLabelText(/your name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Typed Name');
    expect(nameInput.readOnly).toBe(false);

    // Auth resolves with a DIFFERENT verified name
    mockUser = { email: 'user@test.com', user_metadata: { full_name: 'Verified Name' } };
    mockMembership = { team: { name: 'Test Team' } };
    rerender(<ContactPanel />);

    // The input value is preserved (derived state pattern works)
    expect(nameInput.value).toBe('Typed Name');

    // Field should remain editable because the typed value differs from verifiedName
    expect(nameInput.readOnly).toBe(false);

    // Verified badge should NOT appear on the name field because the displayed
    // value ("Typed Name") differs from the verified value ("Verified Name")
    const nameLabel = screen.getByText('Your name').closest('label')!;
    const nameVerifiedBadge = within(nameLabel).queryByText('Verified');
    expect(nameVerifiedBadge).not.toBeInTheDocument();
  });
});
