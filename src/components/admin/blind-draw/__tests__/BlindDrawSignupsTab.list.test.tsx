import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const signups = [
  {
    id: 'signup-1',
    event_date: '2026-09-04',
    first_name: 'Casey',
    last_initial: 'W',
    created_at: '2026-09-04T23:02:00.000Z',
  },
  {
    id: 'signup-2',
    event_date: '2026-09-04',
    first_name: 'Jordan',
    last_initial: 'M',
    created_at: '2026-09-04T23:11:00.000Z',
  },
];

/** A second night, so the picker has something to switch between. */
const nextWeek = {
  id: 'signup-3',
  event_date: '2026-09-11',
  first_name: 'Robin',
  last_initial: 'K',
  created_at: '2026-09-05T18:00:00.000Z',
};

let signupsQuery: { data: typeof signups | undefined; isLoading: boolean; error: unknown } = {
  data: signups,
  isLoading: false,
  error: null,
};
// Plain vi.fn(); the tests assert it is *not* called, and never await it.
const deleteSignup = vi.fn();
let clearSignupsMutation: { mutate: ReturnType<typeof vi.fn>; isPending: boolean };

vi.mock('@/hooks/useBlindDrawSettings', () => ({
  useBlindDrawSettings: () => ({
    data: { id: 's1', signup_confirmation_message: '' },
    isLoading: false,
  }),
  useUpdateBlindDrawSettings: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useBlindDrawSignups', () => ({
  useBlindDrawSignups: () => signupsQuery,
  useDeleteBlindDrawSignup: () => ({ mutateAsync: deleteSignup, isPending: false }),
  useClearBlindDrawSignups: () => clearSignupsMutation,
}));

import BlindDrawSignupsTab from '../BlindDrawSignupsTab';

/**
 * The signups list and its loading skeleton share one `SignupsTable` frame
 * now, rather than each writing the same four headings out. These cover the
 * list itself: that the frame's headings reach it, that rows render, and that
 * the skeleton stands in while loading. See L3 in
 * `docs/audits/UX-AUDIT-2026-09.md`.
 */
describe('Blind Draw signups list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signupsQuery = { data: signups, isLoading: false, error: null };
    clearSignupsMutation = { mutate: vi.fn(), isPending: false };
  });

  it('gives every column a scoped heading', () => {
    render(<BlindDrawSignupsTab />);

    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(5);
    for (const header of headers) {
      expect(header).toHaveAttribute('scope', 'col');
    }
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Night' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
  });

  it('numbers each signup and shows the name as first name plus initial', () => {
    render(<BlindDrawSignupsTab />);

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(signups.length);
    expect(within(rows[0]).getByText('1')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Casey W.')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Jordan M.')).toBeInTheDocument();
  });

  it('asks before removing a signup, and names who it will remove', async () => {
    render(<BlindDrawSignupsTab />);

    const rows = screen.getAllByRole('row').slice(1);
    await userEvent.click(within(rows[0]).getByRole('button', { name: /remove/i }));

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Casey W.');
    expect(deleteSignup).not.toHaveBeenCalled();
  });

  it('stands in with a skeleton that shows the same headings while loading', () => {
    signupsQuery = { data: undefined, isLoading: true, error: null };
    render(<BlindDrawSignupsTab />);

    // The skeleton borrows the real frame, so the headings are already right.
    expect(screen.getAllByRole('columnheader')).toHaveLength(5);
    expect(screen.queryByText('Casey W.')).not.toBeInTheDocument();
  });

  it('says so when nobody has signed up', () => {
    signupsQuery = { data: [], isLoading: false, error: null };
    render(<BlindDrawSignupsTab />);

    expect(screen.getByText('No signups yet')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  /**
   * Signups carry the night they are for, and several nights can be open at
   * once. The list used to show them all mixed together with no way to tell
   * them apart, which is what made "Clear All" wipe next week's too.
   */
  describe('the night picker', () => {
    beforeEach(() => {
      signupsQuery = { data: [...signups, nextWeek], isLoading: false, error: null };
    });

    it('shows which night each signup is for', async () => {
      const user = userEvent.setup();
      render(<BlindDrawSignupsTab />);

      await user.click(screen.getByRole('combobox', { name: /night/i }));
      await user.click(await screen.findByRole('option', { name: 'Sep 4, 2026' }));

      const rows = screen.getAllByRole('row').slice(1);
      // Twice per row: the desktop column, and the line under the name a phone
      // shows instead of the signed-up time.
      expect(within(rows[0]).getAllByText('Sep 4, 2026')).toHaveLength(2);
    });

    it('opens on one night, not on every night at once', () => {
      render(<BlindDrawSignupsTab />);

      // Whichever night the default picks, it is one of them — never the lot.
      const rows = screen.getAllByRole('row').slice(1);
      expect(rows.length).toBeLessThan(3);
      expect(screen.getByText(/signed up/)).toHaveTextContent(String(rows.length));
    });

    it('switches to another night, and back', async () => {
      const user = userEvent.setup();
      render(<BlindDrawSignupsTab />);

      await user.click(screen.getByRole('combobox', { name: /night/i }));
      await user.click(await screen.findByRole('option', { name: 'Sep 11, 2026' }));

      expect(screen.getByText('Robin K.')).toBeInTheDocument();
      expect(screen.queryByText('Casey W.')).not.toBeInTheDocument();

      await user.click(screen.getByRole('combobox', { name: /night/i }));
      await user.click(await screen.findByRole('option', { name: 'Sep 4, 2026' }));

      expect(screen.getByText('Casey W.')).toBeInTheDocument();
      expect(screen.queryByText('Robin K.')).not.toBeInTheDocument();
    });

    it('widens to every night in one tap', async () => {
      const user = userEvent.setup();
      render(<BlindDrawSignupsTab />);

      await user.click(screen.getByRole('combobox', { name: /night/i }));
      await user.click(await screen.findByRole('option', { name: 'All nights' }));

      expect(screen.getAllByRole('row').slice(1)).toHaveLength(3);
      expect(screen.getByText(/3 signed up/)).toBeInTheDocument();
    });

    // Reachable after that night is cleared, or after another admin removes the
    // last row on it: the choice survives, the rows do not.
    it('says a chosen night is empty, not that nobody has signed up at all', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<BlindDrawSignupsTab />);

      await user.click(screen.getByRole('combobox', { name: /night/i }));
      await user.click(await screen.findByRole('option', { name: 'Sep 4, 2026' }));
      expect(screen.getByText('Casey W.')).toBeInTheDocument();

      signupsQuery = { data: [nextWeek], isLoading: false, error: null };
      rerender(<BlindDrawSignupsTab />);

      expect(screen.getByText('Nobody signed up for that night')).toBeInTheDocument();
      expect(screen.queryByText('No signups yet')).not.toBeInTheDocument();
    });
  });
});
