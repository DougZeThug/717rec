import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';

import MatchFormRHF from '../MatchFormRHF';

// Radix Switch measures itself via ResizeObserver, which jsdom lacks.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  } as unknown as typeof ResizeObserver;
}

const teams: Team[] = [
  { id: 'team-a', name: 'Alpha' },
  { id: 'team-b', name: 'Beta' },
  { id: 'team-c', name: 'Gamma' },
];

describe('MatchFormRHF (create mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the Create Match button disabled until a time slot is chosen', () => {
    render(<MatchFormRHF teams={teams} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    const submit = screen.getByRole('button', { name: /create match/i });
    expect(submit).toBeInTheDocument();
    expect(submit).toBeDisabled();
    // The time-slot validation hint is visible while nothing is picked.
    expect(screen.getByText('Please select a time slot')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '7:00 PM' }));
    expect(submit).toBeEnabled();
    expect(screen.queryByText('Please select a time slot')).not.toBeInTheDocument();
  });

  it('calls onCancel when the Cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<MatchFormRHF teams={teams} onSubmit={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('selects teams, picks a slot, and submits the create-mode payload', async () => {
    const onSubmit = vi.fn();
    render(<MatchFormRHF teams={teams} onSubmit={onSubmit} onCancel={vi.fn()} />);

    // Two Radix Select comboboxes: Team 1 and Team 2.
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes).toHaveLength(2);

    // Choose Team 1 = Alpha.
    fireEvent.click(comboboxes[0]);
    fireEvent.click(await screen.findByRole('option', { name: 'Alpha' }));

    // Choose Team 2 = Beta (Alpha is filtered out of this list).
    fireEvent.click(comboboxes[1]);
    fireEvent.click(await screen.findByRole('option', { name: 'Beta' }));

    // Pick a custom date and time slot so the form can submit.
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2026-08-20' } });
    fireEvent.click(screen.getByRole('button', { name: '7:00 PM' }));

    // Result inputs (completion toggle + scores) are edit-mode only. In create
    // mode results must be entered via the atomic score-entry flows, so neither
    // the switch nor the score inputs render here.
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: /create match/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        team1Id: 'team-a',
        team2Id: 'team-b',
        iscompleted: false,
        team1Score: undefined,
        team2Score: undefined,
        winnerId: undefined,
        loserId: undefined,
        timeSlot: '7:00 PM',
        location: '',
      })
    );
    expect(typeof onSubmit.mock.calls[0][0].date).toBe('string');
  });
});
