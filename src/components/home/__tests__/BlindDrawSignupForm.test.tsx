import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BlindDrawSignupForm from '../BlindDrawSignupForm';

const mockMutateAsync = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useBlindDrawSettings', () => ({
  useBlindDrawSettings: () => ({ data: undefined }),
}));
vi.mock('@/hooks/useBlindDrawSignups', () => ({
  useAddBlindDrawSignup: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

describe('BlindDrawSignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('names both fields, since a placeholder is not a name', () => {
    render(<BlindDrawSignupForm eventDate="2026-10-08" />);

    expect(screen.getByRole('textbox', { name: 'First name' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Last initial' })).toBeInTheDocument();
  });

  it('ties each error to its field for screen readers', async () => {
    const user = userEvent.setup();
    render(<BlindDrawSignupForm eventDate="2026-10-08" />);

    await user.click(screen.getByRole('button', { name: /sign up/i }));

    const first = screen.getByRole('textbox', { name: 'First name' });
    const initial = screen.getByRole('textbox', { name: 'Last initial' });
    expect(first).toHaveAttribute('aria-invalid', 'true');
    expect(first).toHaveAccessibleDescription('Name required');
    expect(initial).toHaveAttribute('aria-invalid', 'true');
    expect(initial).toHaveAccessibleDescription('Letter only');
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('adds no aria-invalid while the fields are fine', () => {
    render(<BlindDrawSignupForm eventDate="2026-10-08" />);

    expect(screen.getByRole('textbox', { name: 'First name' })).not.toHaveAttribute('aria-invalid');
  });
});
