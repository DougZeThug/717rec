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
      })
    );
    expect(typeof onSubmit.mock.calls[0][0].date).toBe('string');
    // The form has no court control, so it says nothing about the location
    // rather than sending an empty one. Sending '' is what used to wipe the
    // court off every match that went through this form.
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('location');
  });
});

describe('MatchFormRHF (edit mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Auto Schedule and Batch Match Creation write "Court N" onto every match
  // they make. This form has no court control, so an edit that only moves the
  // date must not have an opinion about the court — it used to send '' and
  // wipe it.
  const upcoming = {
    id: 'match-1',
    team1Id: 'team-a',
    team2Id: 'team-b',
    date: new Date(2026, 7, 20, 19, 0).toISOString(),
    location: 'Court 3',
    timeSlot: '7:00 PM',
    iscompleted: false,
  };

  it('seeds the form from the match it was given', () => {
    render(<MatchFormRHF match={upcoming} teams={teams} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText(/date/i)).toHaveValue('2026-08-20');
    // The slot the match already holds is the pressed one.
    expect(screen.getByRole('button', { name: '7:00 PM' })).toHaveClass('bg-cornhole-navy');
    // Result controls are edit-mode only, and appear even before completion.
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('falls back to the slot implied by the date when the match names none', () => {
    render(
      <MatchFormRHF
        match={{ ...upcoming, timeSlot: undefined }}
        teams={teams}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: '7:00 PM' })).toHaveClass('bg-cornhole-navy');
  });

  it('shows the score inputs only once the match is marked completed', async () => {
    render(<MatchFormRHF match={upcoming} teams={teams} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);

    fireEvent.click(screen.getByRole('switch'));

    await waitFor(() => expect(screen.getAllByRole('spinbutton')).toHaveLength(2));
    // The inputs are labelled with the team names, not "Team 1"/"Team 2".
    expect(screen.getByLabelText(/alpha score/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/beta score/i)).toBeInTheDocument();
  });

  it('sends the scores and the decided winner when the match is completed', async () => {
    const onSubmit = vi.fn();
    render(<MatchFormRHF match={upcoming} teams={teams} onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(screen.getAllByRole('spinbutton')).toHaveLength(2));

    fireEvent.change(screen.getByLabelText(/alpha score/i), { target: { value: '21' } });
    fireEvent.change(screen.getByLabelText(/beta score/i), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: /update match/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      iscompleted: true,
      team1Score: 21,
      team2Score: 15,
      winnerId: 'team-a',
      loserId: 'team-b',
    });
  });

  it('treats a cleared score box as no score rather than zero', async () => {
    const onSubmit = vi.fn();
    render(<MatchFormRHF match={upcoming} teams={teams} onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(screen.getAllByRole('spinbutton')).toHaveLength(2));

    const alpha = screen.getByLabelText(/alpha score/i);
    fireEvent.change(alpha, { target: { value: '21' } });
    fireEvent.change(alpha, { target: { value: '' } });

    expect(alpha).toHaveValue(null);
  });

  it('treats a cleared score box as no score on the other side too', async () => {
    render(<MatchFormRHF match={upcoming} teams={teams} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(screen.getAllByRole('spinbutton')).toHaveLength(2));

    const beta = screen.getByLabelText(/beta score/i);
    fireEvent.change(beta, { target: { value: '15' } });
    fireEvent.change(beta, { target: { value: '' } });

    expect(beta).toHaveValue(null);
  });

  it('leaves the scores out entirely when the match is not completed', async () => {
    const onSubmit = vi.fn();
    render(
      <MatchFormRHF
        match={{ ...upcoming, team1Score: 21, team2Score: 15 }}
        teams={teams}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /update match/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      iscompleted: false,
      team1Score: undefined,
      team2Score: undefined,
    });
  });

  it('holds the buttons while a save is in flight', () => {
    render(
      <MatchFormRHF
        match={upcoming}
        teams={teams}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isUpdating
      />
    );

    expect(screen.getByRole('button', { name: /update match/i })).toBeDisabled();
  });

  it('cancels without submitting', () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    render(<MatchFormRHF match={upcoming} teams={teams} onSubmit={onSubmit} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('says nothing about the location, so an existing court survives a save', async () => {
    const onSubmit = vi.fn();
    const match = {
      id: 'match-1',
      team1Id: 'team-a',
      team2Id: 'team-b',
      date: new Date(2026, 7, 20, 19, 0).toISOString(),
      location: 'Court 3',
      timeSlot: '7:00 PM',
      iscompleted: false,
    };

    render(<MatchFormRHF match={match} teams={teams} onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /update match/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('location');
  });
});
