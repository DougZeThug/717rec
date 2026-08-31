import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Tables } from '@/integrations/supabase/types';

import { MatchCorrectionsPanel } from '../MatchCorrectionsPanel';

// ─── Hook mocks (the three dialogs render for real) ───────────────────────────

const mockUpdateRound = { mutateAsync: vi.fn(), isPending: false };
const mockDeleteRound = { mutateAsync: vi.fn(), isPending: false };
const mockChangeGameWinner = { mutateAsync: vi.fn(), isPending: false };

const useLiveMatchMock = vi.fn();
const useAdminCorrectionsMock = vi.fn();
const useSeasonsMock = vi.fn();
const mockReopenAndRefinalize = { mutate: vi.fn(), isPending: false };

vi.mock('@/hooks/live-scoring/useLiveMatch', () => ({
  useLiveMatch: (matchId?: string) => useLiveMatchMock(matchId),
}));

vi.mock('@/hooks/live-scoring/useAdminCorrections', () => ({
  useAdminCorrections: (opts: unknown) => useAdminCorrectionsMock(opts),
}));

vi.mock('@/hooks/useSeasons', () => ({
  useSeasons: () => useSeasonsMock(),
}));

vi.mock('@/hooks/live-scoring/useFinalizeMatch', () => ({
  useFinalizeMatch: () => ({ reopenAndRefinalize: mockReopenAndRefinalize }),
}));

vi.mock('@/services/liveScoring/TeamPlayersService', () => ({
  TeamPlayersService: {
    fetchTeamPlayers: vi.fn((teamId: string) =>
      Promise.resolve(
        teamId === 'team-1'
          ? [makeRosterPlayer('p1', 'Alice', 'team-1'), makeRosterPlayer('p2', 'Ava', 'team-1')]
          : [makeRosterPlayer('p3', 'Bert', 'team-2'), makeRosterPlayer('p4', 'Bea', 'team-2')]
      )
    ),
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeRosterPlayer(id: string, displayName: string, teamId: string) {
  return {
    id,
    display_name: displayName,
    team_id: teamId,
    profile_id: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  } as Tables<'team_players'>;
}

const round1 = {
  id: 'round-1',
  game_id: 'game-1',
  round_number: 1,
  team1_score: 2,
  team2_score: 1,
  team1_bags_in: 0,
  team1_bags_on: 2,
  team1_bags_off: 2,
  team2_bags_in: 0,
  team2_bags_on: 1,
  team2_bags_off: 3,
  team1_thrower_id: 'p1',
  team2_thrower_id: 'p3',
} as Tables<'match_rounds'>;

const game1 = {
  id: 'game-1',
  game_number: 1,
  status: 'completed',
  winner_team_id: 'team-1',
} as Tables<'games'>;

const game2 = {
  id: 'game-2',
  game_number: 2,
  status: 'in_progress',
  winner_team_id: null,
} as Tables<'games'>;

const gamePlayers = (ids: string[]) =>
  ids.map((id) => ({ player_id: id })) as Tables<'game_players'>[];

function makeBundle(overrides: { iscompleted?: boolean; seasonId?: string | null } = {}) {
  return {
    match: {
      id: 'match-1',
      season_id: overrides.seasonId === undefined ? 'season-live' : overrides.seasonId,
      iscompleted: overrides.iscompleted ?? false,
      team1_id: 'team-1',
      team2_id: 'team-2',
      team1: { name: 'Team A' },
      team2: { name: 'Team B' },
    },
    games: [game1, game2],
    rounds: [round1],
  };
}

function makeDerived() {
  return {
    games: [
      {
        game: game1,
        rounds: [round1],
        totals: { team1: 2, team2: 1 },
        players: { team1: gamePlayers(['p1', 'p2']), team2: gamePlayers(['p3', 'p4']) },
      },
      {
        game: game2,
        rounds: [],
        totals: { team1: 0, team2: 0 },
        players: { team1: gamePlayers(['p1', 'p2']), team2: gamePlayers(['p3', 'p4']) },
      },
    ],
  };
}

function setSeasons(seasons = [{ id: 'season-live', name: 'Summer 1', is_archived: false }]) {
  useSeasonsMock.mockReturnValue({ data: seasons });
}

function setLiveMatch(value: Record<string, unknown>) {
  useLiveMatchMock.mockReturnValue({
    bundle: undefined,
    derived: undefined,
    isLoading: false,
    isNotEnabled: false,
    ...value,
  });
}

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MatchCorrectionsPanel matchId="match-1" />
    </QueryClientProvider>
  );
}

describe('MatchCorrectionsPanel', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    useAdminCorrectionsMock.mockReturnValue({
      updateRound: mockUpdateRound,
      deleteRound: mockDeleteRound,
      changeGameWinner: mockChangeGameWinner,
    });
    mockUpdateRound.mutateAsync.mockImplementation(() => Promise.resolve());
    mockDeleteRound.mutateAsync.mockImplementation(() => Promise.resolve());
    mockChangeGameWinner.mutateAsync.mockImplementation(() => Promise.resolve());
    mockReopenAndRefinalize.mutate.mockReset();
    mockReopenAndRefinalize.isPending = false;
    setSeasons();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state while the match loads', () => {
    setLiveMatch({ isLoading: true });
    renderPanel();

    expect(screen.getByText('Loading match…')).toBeInTheDocument();
  });

  it('explains when the match has no live-scoring data', () => {
    setLiveMatch({ isNotEnabled: true });
    renderPanel();

    expect(screen.getByText('No live-scoring data for this match.')).toBeInTheDocument();
  });

  it('lists each game with its rounds, totals, and winner', () => {
    setLiveMatch({ bundle: makeBundle(), derived: makeDerived() });
    renderPanel();

    expect(screen.getByText(/Game 1 · Team A 2 – 1 Team B/u)).toBeInTheDocument();
    expect(screen.getByText('Winner: Team A')).toBeInTheDocument();
    expect(screen.getByText('Round 1')).toBeInTheDocument();
    // Game 2 has no rounds recorded yet.
    expect(screen.getByText('No rounds recorded.')).toBeInTheDocument();
  });

  // ─── B-20: an archived season is read-only ──────────────────────────────────

  const ARCHIVED_SEASONS = [
    { id: 'season-live', name: 'Summer 1', is_archived: false },
    { id: 'season-old', name: 'Winter 0', is_archived: true },
  ];

  function renderArchivedPanel() {
    setSeasons(ARCHIVED_SEASONS);
    setLiveMatch({
      bundle: makeBundle({ iscompleted: true, seasonId: 'season-old' }),
      derived: makeDerived(),
    });
    return renderPanel();
  }

  it('says an archived season is read-only, and names it', () => {
    renderArchivedPanel();

    expect(screen.getByText(/is archived, so this match is/)).toBeInTheDocument();
    expect(screen.getByText('Winter 0')).toBeInTheDocument();
  });

  it('offers no edit, delete or winner control on an archived season', () => {
    renderArchivedPanel();

    expect(screen.queryByRole('button', { name: /Edit round/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete round/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Change winner/ })).not.toBeInTheDocument();
  });

  it('still shows the rounds and totals of an archived season', () => {
    renderArchivedPanel();

    expect(screen.getByText('Round 1')).toBeInTheDocument();
    // The game header and the round row both carry the score.
    expect(screen.getAllByText(/Team A 2 – 1 Team B/).length).toBeGreaterThan(0);
  });

  it('drops the finalized warning on an archived season, which cannot be edited anyway', () => {
    renderArchivedPanel();

    expect(screen.queryByText(/until the result is saved again/)).not.toBeInTheDocument();
  });

  it('keeps every control when the match belongs to a live season', () => {
    setSeasons(ARCHIVED_SEASONS);
    setLiveMatch({
      bundle: makeBundle({ iscompleted: true, seasonId: 'season-live' }),
      derived: makeDerived(),
    });
    renderPanel();

    expect(screen.getByRole('button', { name: 'Edit round 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete round 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Change winner/ })).toBeInTheDocument();
    expect(screen.queryByText(/is archived, so this match is/)).not.toBeInTheDocument();
  });

  it('warns that a finalized match needs re-saving after edits', () => {
    setLiveMatch({ bundle: makeBundle({ iscompleted: true }), derived: makeDerived() });
    renderPanel();

    expect(screen.getByText(/until the result is saved again/)).toBeInTheDocument();
  });

  // ─── B-19: reopen and re-save in one press ──────────────────────────────────

  function renderFinalized() {
    setLiveMatch({ bundle: makeBundle({ iscompleted: true }), derived: makeDerived() });
    return renderPanel();
  }

  it('offers Reopen & re-save only on a finalized match', () => {
    setLiveMatch({ bundle: makeBundle({ iscompleted: false }), derived: makeDerived() });
    const { unmount } = renderPanel();
    expect(
      screen.queryByRole('button', { name: /Reopen & re-save result/ })
    ).not.toBeInTheDocument();
    unmount();

    renderFinalized();
    expect(screen.getByRole('button', { name: /Reopen & re-save result/ })).toBeInTheDocument();
  });

  it('asks before reopening, because both teams\u2019 records are reversed', async () => {
    const user = userEvent.setup();
    renderFinalized();

    await user.click(screen.getByRole('button', { name: /Reopen & re-save result/ }));

    expect(await screen.findByText('Reopen and re-save this result?')).toBeInTheDocument();
    expect(mockReopenAndRefinalize.mutate).not.toHaveBeenCalled();
  });

  it('writes nothing when the confirmation is dismissed', async () => {
    const user = userEvent.setup();
    renderFinalized();

    await user.click(screen.getByRole('button', { name: /Reopen & re-save result/ }));
    await user.click(await screen.findByRole('button', { name: 'Leave it alone' }));

    await waitFor(() =>
      expect(screen.queryByText('Reopen and re-save this result?')).not.toBeInTheDocument()
    );
    expect(mockReopenAndRefinalize.mutate).not.toHaveBeenCalled();
  });

  it('reopens and re-saves once confirmed', async () => {
    const user = userEvent.setup();
    renderFinalized();

    await user.click(screen.getByRole('button', { name: /Reopen & re-save result/ }));
    await user.click(await screen.findByRole('button', { name: 'Reopen & re-save' }));

    expect(mockReopenAndRefinalize.mutate).toHaveBeenCalledTimes(1);
  });

  it('shows the write in progress and blocks a second press', () => {
    mockReopenAndRefinalize.isPending = true;
    renderFinalized();

    expect(screen.getByRole('button', { name: /Re-saving…/ })).toBeDisabled();
  });

  it('offers no Reopen & re-save on an archived season', () => {
    setSeasons([
      { id: 'season-live', name: 'Summer 1', is_archived: false },
      { id: 'season-old', name: 'Winter 0', is_archived: true },
    ]);
    setLiveMatch({
      bundle: makeBundle({ iscompleted: true, seasonId: 'season-old' }),
      derived: makeDerived(),
    });
    renderPanel();

    expect(
      screen.queryByRole('button', { name: /Reopen & re-save result/ })
    ).not.toBeInTheDocument();
  });

  it('hides the change-winner action for a game still in progress', () => {
    setLiveMatch({ bundle: makeBundle(), derived: makeDerived() });
    renderPanel();

    // Only the completed game-1 offers it.
    expect(screen.getAllByRole('button', { name: 'Change winner' })).toHaveLength(1);
  });

  it('submits an edited round through the corrections hook', async () => {
    const user = userEvent.setup();
    setLiveMatch({ bundle: makeBundle(), derived: makeDerived() });
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'Edit round 1' }));

    // Score and bag breakdown must stay consistent or the dialog blocks saving.
    fireEvent.change(await screen.findByLabelText('Score', { selector: '#team1-score' }), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByLabelText('On', { selector: '#team1-on' }), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByLabelText('Off', { selector: '#team1-off' }), {
      target: { value: '1' },
    });
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(mockUpdateRound.mutateAsync).toHaveBeenCalledTimes(1));
    expect(mockUpdateRound.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        roundId: 'round-1',
        patch: expect.objectContaining({ team1Score: 3 }),
      })
    );
  });

  it('deletes a round through the corrections hook', async () => {
    const user = userEvent.setup();
    setLiveMatch({ bundle: makeBundle(), derived: makeDerived() });
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'Delete round 1' }));
    await user.click(await screen.findByRole('button', { name: /delete round/i }));

    await waitFor(() => expect(mockDeleteRound.mutateAsync).toHaveBeenCalledWith('round-1'));
  });

  it('changes a completed game winner through the corrections hook', async () => {
    const user = userEvent.setup();
    setLiveMatch({ bundle: makeBundle(), derived: makeDerived() });
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'Change winner' }));
    await user.click(await screen.findByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Team B' }));
    await user.click(screen.getByRole('button', { name: 'Set winner' }));

    await waitFor(() =>
      expect(mockChangeGameWinner.mutateAsync).toHaveBeenCalledWith({
        gameId: 'game-1',
        winnerTeamId: 'team-2',
        finalTotals: { team1: 2, team2: 1 },
      })
    );
  });
});
