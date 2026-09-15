import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Two nights, so "clear the night on screen" and "clear every night" are
// actually different outcomes.
const NIGHT = '2026-09-04';
const OTHER_NIGHT = '2026-09-11';

const signups = [
  {
    id: 'signup-1',
    event_date: NIGHT,
    first_name: 'Casey',
    last_initial: 'W',
    created_at: '2026-09-04T23:02:00Z',
  },
  {
    id: 'signup-2',
    event_date: NIGHT,
    first_name: 'Jordan',
    last_initial: 'M',
    created_at: '2026-09-04T23:11:00Z',
  },
  {
    id: 'signup-3',
    event_date: OTHER_NIGHT,
    first_name: 'Robin',
    last_initial: 'K',
    created_at: '2026-09-05T18:00:00Z',
  },
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

/** Opens the prompt on one named night, or on every night. */
const openThePrompt = async (chooseNight = 'Sep 4, 2026') => {
  const user = userEvent.setup();
  const { rerender } = render(<BlindDrawSignupsTab />);

  await user.click(screen.getByRole('combobox', { name: /night/i }));
  await user.click(await screen.findByRole('option', { name: chooseNight }));

  await user.click(screen.getByRole('button', { name: /^clear /i }));
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

  it('asks first, counting only the night on screen and naming it', async () => {
    await openThePrompt();

    expect(screen.getByText('Clear this night?')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This will remove the 2 signups for Sep 4, 2026. Other nights are left alone. This action cannot be undone.'
      )
    ).toBeInTheDocument();
    expect(clearSignupsMutation.mutate).not.toHaveBeenCalled();
  });

  it('writes nothing when the prompt is cancelled', async () => {
    const { user } = await openThePrompt();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(clearSignupsMutation.mutate).not.toHaveBeenCalled();
  });

  // The whole point of the change: next week's signups survive tonight's draw.
  it('clears only the night on screen', async () => {
    const { user } = await openThePrompt();

    await user.click(screen.getByRole('button', { name: /^clear sep 4, 2026$/i }));

    expect(clearSignupsMutation.mutate).toHaveBeenCalledTimes(1);
    expect(clearSignupsMutation.mutate).toHaveBeenCalledWith(NIGHT, expect.anything());
  });

  describe('under "All nights"', () => {
    it('says out loud that it clears every night, not just tonight', async () => {
      await openThePrompt('All nights');

      expect(screen.getByText('Clear every night?')).toBeInTheDocument();
      expect(
        screen.getByText(
          'This will remove all 3 signups, for every night, not just tonight. This action cannot be undone.'
        )
      ).toBeInTheDocument();
    });

    it('clears every night when that is what was asked for', async () => {
      const { user } = await openThePrompt('All nights');

      await user.click(screen.getByRole('button', { name: /^clear every night$/i }));

      expect(clearSignupsMutation.mutate).toHaveBeenCalledWith(undefined, expect.anything());
    });
  });

  it('stays up reading "Clearing..." while the wipe runs, with both buttons dead', async () => {
    const { user, rerender } = await openThePrompt();

    await user.click(screen.getByRole('button', { name: /^clear sep 4, 2026$/i }));
    clearSignupsMutation = { mutate: vi.fn(), isPending: true };
    rerender();

    expect(screen.getByText('Clear this night?')).toBeInTheDocument();
    expect(screen.getByText('Clearing...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clearing/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('will not reopen the prompt while a wipe is already running', () => {
    clearSignupsMutation = { mutate: vi.fn(), isPending: true };
    render(<BlindDrawSignupsTab />);

    expect(screen.getByRole('button', { name: /^clear /i })).toBeDisabled();
  });

  it('leaves the prompt open when the wipe fails, so it can be retried', async () => {
    clearSignupsMutation = {
      // Never calls onSuccess, which is the only thing that closes the prompt.
      mutate: vi.fn(),
      isPending: false,
    };
    const { user } = await openThePrompt();

    await user.click(screen.getByRole('button', { name: /^clear sep 4, 2026$/i }));

    expect(screen.getByText('Clear this night?')).toBeInTheDocument();
  });

  it('closes the prompt only once the wipe has succeeded', async () => {
    clearSignupsMutation = {
      mutate: vi.fn((_input, options) => options?.onSuccess?.()),
      isPending: false,
    };
    const { user } = await openThePrompt();

    await user.click(screen.getByRole('button', { name: /^clear sep 4, 2026$/i }));

    expect(screen.queryByText('Clear this night?')).not.toBeInTheDocument();
  });
});
