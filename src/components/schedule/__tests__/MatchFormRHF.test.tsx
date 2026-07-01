import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';

import MatchFormRHF from '../MatchFormRHF';

// Radix Switch measures itself via ResizeObserver, which jsdom lacks.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
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

  it('selects teams, toggles completion, enters scores and submits the expected payload', async () => {
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

    // Pick a time slot so the form can submit.
    fireEvent.click(screen.getByRole('button', { name: '7:00 PM' }));

    // Score inputs are hidden until the match is marked completed.
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);

    // Toggle the "Match Completed" switch.
    fireEvent.click(screen.getByRole('switch'));

    // Now the conditional score section is rendered with a labelled input per team.
    const scoreInputs = await screen.findAllByRole('spinbutton');
    expect(scoreInputs).toHaveLength(2);
    expect(screen.getByText('Alpha Score')).toBeInTheDocument();
    expect(screen.getByText('Beta Score')).toBeInTheDocument();

    fireEvent.change(scoreInputs[0], { target: { value: '21' } });
    fireEvent.change(scoreInputs[1], { target: { value: '15' } });

    fireEvent.click(screen.getByRole('button', { name: /create match/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        team1Id: 'team-a',
        team2Id: 'team-b',
        iscompleted: true,
        team1Score: 21,
        team2Score: 15,
        timeSlot: '7:00 PM',
        winnerId: 'team-a',
        loserId: 'team-b',
        location: '',
      })
    );
    expect(typeof onSubmit.mock.calls[0][0].date).toBe('string');
  });
});
