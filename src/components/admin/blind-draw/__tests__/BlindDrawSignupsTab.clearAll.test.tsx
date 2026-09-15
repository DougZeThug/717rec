import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const signups = [
  { id: 'signup-1', first_name: 'Casey', last_initial: 'W', created_at: '2026-09-04T23:02:00Z' },
  { id: 'signup-2', first_name: 'Jordan', last_initial: 'M', created_at: '2026-09-04T23:11:00Z' },
];

let clearSignupsMutation: { mutate: ReturnType<typeof vi.fn>; isPending: boolean };

vi.mock('@/hooks/useBlindDrawSettings', () => ({
  useBlindDrawSettings: () => ({
    data: { id: 's1', signup_confirmation_message: '' },
    isLoading: false,
  }),
  useUpdateBlindDrawSettings: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useBlindDrawSignups', () => ({
  useBlindDrawSignups: () => ({ data: signups, isLoading: false, error: null }),
  useDeleteBlindDrawSignup: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useClearBlindDrawSignups: () => clearSignupsMutation,
}));

import BlindDrawSignupsTab from '../BlindDrawSignupsTab';

const openThePrompt = async () => {
  const user = userEvent.setup();
  const { rerender } = render(<BlindDrawSignupsTab />);
  await user.click(screen.getByRole('button', { name: /clear all/i }));
  // The hook is mocked at module scope, so reassigning it needs a re-render to
  // reach the component. `isClearing` is component state and survives one.
  return { user, rerender: () => rerender(<BlindDrawSignupsTab />) };
};

/**
 * Clear All wipes every signup and says it cannot be undone, but it used to
 * close the instant it was confirmed: the mutation ran fire-and-forget, with no
 * `e.preventDefault()`, no `isPending` anywhere, and no spinner. The list still
 * showed everyone, so nothing told the admin whether the wipe was running or
 * had already failed. The Remove prompt in the same file has always done this
 * properly. See A-17 in `docs/audits/UX-AUDIT-2026-09.md`.
 */
describe('Blind Draw "Clear All"', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSignupsMutation = { mutate: vi.fn(), isPending: false };
  });

  it('asks first, and counts what it will remove', async () => {
    await openThePrompt();

    expect(screen.getByText('Clear all signups?')).toBeInTheDocument();
    expect(
      screen.getByText('This will remove all 2 signups. This action cannot be undone.')
    ).toBeInTheDocument();
    expect(clearSignupsMutation.mutate).not.toHaveBeenCalled();
  });

  it('writes nothing when the prompt is cancelled', async () => {
    const { user } = await openThePrompt();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(clearSignupsMutation.mutate).not.toHaveBeenCalled();
  });

  it('wipes the signups when confirmed', async () => {
    const { user } = await openThePrompt();

    await user.click(screen.getByRole('button', { name: /^clear all$/i }));

    expect(clearSignupsMutation.mutate).toHaveBeenCalledTimes(1);
  });

  it('stays up reading "Clearing..." while the wipe runs, with both buttons dead', async () => {
    const { user, rerender } = await openThePrompt();

    await user.click(screen.getByRole('button', { name: /^clear all$/i }));
    clearSignupsMutation = { mutate: vi.fn(), isPending: true };
    rerender();

    expect(screen.getByText('Clear all signups?')).toBeInTheDocument();
    expect(screen.getByText('Clearing...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clearing/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('will not reopen the prompt while a wipe is already running', () => {
    clearSignupsMutation = { mutate: vi.fn(), isPending: true };
    render(<BlindDrawSignupsTab />);

    expect(screen.getByRole('button', { name: /clear all/i })).toBeDisabled();
  });

  it('leaves the prompt open when the wipe fails, so it can be retried', async () => {
    clearSignupsMutation = {
      // Never calls onSuccess, which is the only thing that closes the prompt.
      mutate: vi.fn(),
      isPending: false,
    };
    const { user } = await openThePrompt();

    await user.click(screen.getByRole('button', { name: /^clear all$/i }));

    expect(screen.getByText('Clear all signups?')).toBeInTheDocument();
  });

  it('closes the prompt only once the wipe has succeeded', async () => {
    clearSignupsMutation = {
      mutate: vi.fn((_input, options) => options?.onSuccess?.()),
      isPending: false,
    };
    const { user } = await openThePrompt();

    await user.click(screen.getByRole('button', { name: /^clear all$/i }));

    expect(screen.queryByText('Clear all signups?')).not.toBeInTheDocument();
  });
});
