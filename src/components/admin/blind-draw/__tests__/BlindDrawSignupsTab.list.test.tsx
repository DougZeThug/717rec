import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const signups = [
  {
    id: 'signup-1',
    first_name: 'Casey',
    last_initial: 'W',
    created_at: '2026-09-04T23:02:00.000Z',
  },
  {
    id: 'signup-2',
    first_name: 'Jordan',
    last_initial: 'M',
    created_at: '2026-09-04T23:11:00.000Z',
  },
];

let signupsQuery: { data: typeof signups | undefined; isLoading: boolean; error: unknown } = {
  data: signups,
  isLoading: false,
  error: null,
};
const deleteSignup = vi.fn().mockResolvedValue(undefined);

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
  useClearBlindDrawSignups: () => ({ mutateAsync: vi.fn(), isPending: false }),
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
  });

  it('gives every column a scoped heading', () => {
    render(<BlindDrawSignupsTab />);

    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(4);
    for (const header of headers) {
      expect(header).toHaveAttribute('scope', 'col');
    }
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
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
    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.queryByText('Casey W.')).not.toBeInTheDocument();
  });

  it('says so when nobody has signed up', () => {
    signupsQuery = { data: [], isLoading: false, error: null };
    render(<BlindDrawSignupsTab />);

    expect(screen.getByText('No signups yet')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
