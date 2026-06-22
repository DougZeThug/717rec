import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMutateAsync = vi.fn();
let mockUser: { email?: string; user_metadata?: { full_name?: string; name?: string } } | null =
  null;
let mockMembership: { team?: { name: string } } | null = null;

vi.mock('@/contexts/AuthContext', () => ({
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
    mockMutateAsync.mockResolvedValue();
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
});
