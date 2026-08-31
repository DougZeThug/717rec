import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
}));

import { MatchResultDriftService } from '../MatchResultDriftService';

const pgError = () => ({
  message: 'boom',
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

/** Thenable stand-in for a Supabase query builder: every filter returns itself. */
const chain = (result: { data: unknown; error: unknown }) => {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'in', 'order']) {
    builder[method] = () => builder;
  }
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
};

const SEASON_ID = 's-1';

/** A finalized match Team A won 2-0. */
const matchRow = (over: Record<string, unknown> = {}) => ({
  id: 'm-1',
  date: '2026-08-20T23:00:00Z',
  season_id: SEASON_ID,
  team1_id: 't-1',
  team2_id: 't-2',
  winner_id: 't-1',
  iscompleted: true,
  team1_game_wins: 2,
  team2_game_wins: 0,
  team1: { id: 't-1', name: 'Sweat Bandits' },
  team2: { id: 't-2', name: 'Corn Stars' },
  ...over,
});

/** A completed game Team A won 21-0, whose stored score matches its rounds. */
const gameRow = (over: Record<string, unknown> = {}) => ({
  id: 'g-1',
  match_id: 'm-1',
  game_number: 1,
  status: 'completed',
  winner_team_id: 't-1',
  team1_score: 21,
  team2_score: 0,
  ...over,
});

/** Rounds that fold to 21-0 for team 1 under cancellation scoring. */
const cleanRounds = (gameId: string) =>
  Array.from({ length: 7 }, (_, i) => ({
    match_id: 'm-1',
    game_id: gameId,
    round_number: i + 1,
    team1_score: 3,
    team2_score: 0,
  }));

/** Queue the three queries the service makes, in order: matches, games, rounds. */
const mockQueries = (matches: unknown[], games: unknown[], rounds: unknown[]) => {
  mockFrom
    .mockReturnValueOnce(chain({ data: matches, error: null }))
    .mockReturnValueOnce(chain({ data: games, error: null }))
    .mockReturnValueOnce(chain({ data: rounds, error: null }));
};

/** A healthy best-of-three: two completed games, both agreeing with their rounds. */
const healthy = () => ({
  matches: [matchRow()],
  games: [gameRow(), gameRow({ id: 'g-2', game_number: 2 })],
  rounds: [...cleanRounds('g-1'), ...cleanRounds('g-2')],
});

describe('MatchResultDriftService.fetchMatchResultDrift', () => {
  beforeEach(() => {
    // mockReset, not clearAllMocks: these tests queue return values with
    // mockReturnValueOnce and a queue that does not drain would leak forward.
    mockFrom.mockReset();
  });

  it('reports nothing when the match agrees with its own rounds', async () => {
    const { matches, games, rounds } = healthy();
    mockQueries(matches, games, rounds);

    await expect(MatchResultDriftService.fetchMatchResultDrift(SEASON_ID)).resolves.toEqual([]);
  });

  it('returns nothing when the season has no matches', async () => {
    mockQueries([], [], []);

    await expect(MatchResultDriftService.fetchMatchResultDrift(SEASON_ID)).resolves.toEqual([]);
  });

  it('ignores a match that was never live-scored', async () => {
    mockQueries([matchRow()], [], []);

    await expect(MatchResultDriftService.fetchMatchResultDrift(SEASON_ID)).resolves.toEqual([]);
  });

  it('reports a recorded winner the games no longer support', async () => {
    const { games, rounds } = healthy();
    mockQueries([matchRow({ winner_id: 't-2' })], games, rounds);

    const [row] = await MatchResultDriftService.fetchMatchResultDrift(SEASON_ID);

    expect(row.kind).toBe('match-winner');
    expect(row.recorded).toContain('Corn Stars');
    expect(row.derived).toContain('Sweat Bandits');
    expect(row.team1Name).toBe('Sweat Bandits');
  });

  it('reports stored game wins that do not match the games', async () => {
    const { games, rounds } = healthy();
    mockQueries([matchRow({ team1_game_wins: 2, team2_game_wins: 1 })], games, rounds);

    const [row] = await MatchResultDriftService.fetchMatchResultDrift(SEASON_ID);

    expect(row.kind).toBe('match-game-wins');
    expect(row.recorded).toContain('2–1');
    expect(row.derived).toContain('2–0');
  });

  it('reports a completed game whose winner its rounds contradict', async () => {
    // Team 2 takes game 1 by 21-0 in the rounds, but the game still says team 1.
    const flipped = cleanRounds('g-1').map((r) => ({
      ...r,
      team1_score: 0,
      team2_score: 3,
    }));
    mockQueries(
      // No recorded result, so only the game-level check can fire.
      [matchRow({ winner_id: null, iscompleted: false })],
      [gameRow({ team1_score: 0, team2_score: 21 })],
      flipped
    );

    const [row] = await MatchResultDriftService.fetchMatchResultDrift(SEASON_ID);

    expect(row.kind).toBe('game-winner');
    expect(row.recorded).toContain('Sweat Bandits');
    expect(row.derived).toContain('Corn Stars');
  });

  it('reports a completed game whose stored score its rounds contradict', async () => {
    // One round was deleted, so the rounds now fold to 18-0, not the stored 21-0.
    mockQueries(
      [matchRow()],
      [gameRow(), gameRow({ id: 'g-2', game_number: 2 })],
      [...cleanRounds('g-1').slice(0, 6), ...cleanRounds('g-2')]
    );

    const [row] = await MatchResultDriftService.fetchMatchResultDrift(SEASON_ID);

    expect(row.kind).toBe('game-score');
    expect(row.recorded).toContain('21–0');
    expect(row.derived).toContain('18–0');
  });

  it('reports a completed game left with no rounds at all', async () => {
    mockQueries(
      [matchRow()],
      [gameRow(), gameRow({ id: 'g-2', game_number: 2 })],
      [...cleanRounds('g-1')]
    );

    const [row] = await MatchResultDriftService.fetchMatchResultDrift(SEASON_ID);

    expect(row.kind).toBe('game-no-rounds');
    expect(row.recorded).toContain('game 2');
  });

  it('reports the worst disagreement when a match has several', async () => {
    mockQueries(
      [matchRow({ winner_id: 't-2', team1_game_wins: 0, team2_game_wins: 2 })],
      [gameRow(), gameRow({ id: 'g-2', game_number: 2 })],
      [...cleanRounds('g-1').slice(0, 6), ...cleanRounds('g-2')]
    );

    const [rows] = await MatchResultDriftService.fetchMatchResultDrift(SEASON_ID);

    expect(rows.kind).toBe('match-winner');
  });

  it('skips an in-progress game, whose stored totals are stale on purpose', async () => {
    mockQueries(
      [matchRow({ winner_id: null, iscompleted: false })],
      [gameRow({ status: 'in_progress', team1_score: 99, team2_score: 4 })],
      cleanRounds('g-1')
    );

    await expect(MatchResultDriftService.fetchMatchResultDrift(SEASON_ID)).resolves.toEqual([]);
  });

  it('reports a match completed with no winner at all against the games that decided it', async () => {
    // iscompleted with winner_id null is a state the league can be left in - a
    // tie, or a half-written result. The games say team 1 took it 2-0.
    const { games, rounds } = healthy();
    mockQueries([matchRow({ winner_id: null, iscompleted: true })], games, rounds);

    const [row] = await MatchResultDriftService.fetchMatchResultDrift(SEASON_ID);

    expect(row.kind).toBe('match-winner');
    expect(row.recorded).toContain('nobody');
    expect(row.derived).toContain('Sweat Bandits');
  });

  // ─── Teams can share a name, so every comparison must go by id ─────────────
  //
  // src/types/headToHead.ts: "team names are not unique". There is no unique
  // constraint on teams.name. Comparing display names made two same-named teams
  // read as the same winner, and the disagreement went unreported.

  const SAME_NAME = 'Corn Stars';
  const sameNamedTeams = {
    team1: { id: 't-1', name: SAME_NAME },
    team2: { id: 't-2', name: SAME_NAME },
  };

  it('reports a game winner that contradicts its rounds even when both teams share a name', async () => {
    // The rounds give game 1 to team 2; the game still records team 1.
    const flipped = cleanRounds('g-1').map((r) => ({ ...r, team1_score: 0, team2_score: 3 }));
    mockQueries(
      [matchRow({ ...sameNamedTeams, winner_id: null, iscompleted: false })],
      [gameRow({ team1_score: 0, team2_score: 21 })],
      flipped
    );

    const [row] = await MatchResultDriftService.fetchMatchResultDrift(SEASON_ID);

    expect(row?.kind).toBe('game-winner');
  });

  it('reports a match winner that contradicts its games even when both teams share a name', async () => {
    // Both games go to team 1; the match records team 2 as the winner.
    const { games, rounds } = healthy();
    mockQueries([matchRow({ ...sameNamedTeams, winner_id: 't-2' })], games, rounds);

    const [row] = await MatchResultDriftService.fetchMatchResultDrift(SEASON_ID);

    expect(row?.kind).toBe('match-winner');
  });

  it('does not invent a disagreement when a shared name is on the right team', async () => {
    const { games, rounds } = healthy();
    mockQueries([matchRow({ ...sameNamedTeams })], games, rounds);

    await expect(MatchResultDriftService.fetchMatchResultDrift(SEASON_ID)).resolves.toEqual([]);
  });

  // ─── Rows the detector has to step over ────────────────────────────────────

  it('ignores a match in the season that was never live-scored', async () => {
    // The realistic season: one match scored live and drifting, one resulted in
    // bulk with no games at all. Only the first can be compared to its rounds.
    const { games, rounds } = healthy();
    mockQueries(
      [matchRow({ winner_id: 't-2' }), matchRow({ id: 'm-2', winner_id: 't-1' })],
      games,
      rounds
    );

    const rows = await MatchResultDriftService.fetchMatchResultDrift(SEASON_ID);

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('m-1');
  });

  it('steps over games and rounds that carry no owning id', async () => {
    // games.match_id and match_rounds.match_id/game_id are all nullable. An
    // orphan must be skipped, not counted against some other match.
    const { games, rounds } = healthy();
    mockQueries(
      [matchRow({ winner_id: 't-2' })],
      [...games, gameRow({ id: 'g-orphan', match_id: null, game_number: 9 })],
      [
        ...rounds,
        { match_id: null, game_id: 'g-1', round_number: 99, team1_score: 12, team2_score: 0 },
        { match_id: 'm-1', game_id: null, round_number: 99, team1_score: 12, team2_score: 0 },
      ]
    );

    const rows = await MatchResultDriftService.fetchMatchResultDrift(SEASON_ID);

    // The orphans changed nothing: the match still reports only its real fault.
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe('match-winner');
  });

  it('names an unknown team rather than a blank when the team join is missing', async () => {
    const { games, rounds } = healthy();
    mockQueries([matchRow({ winner_id: 't-2', team1: null })], games, rounds);

    const [row] = await MatchResultDriftService.fetchMatchResultDrift(SEASON_ID);

    expect(row.team1Name).toBe('Unknown team');
    expect(row.team2Name).toBe('Corn Stars');
  });

  it('throws a DatabaseError when the game read fails', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: [matchRow()], error: null }))
      .mockReturnValueOnce(chain({ data: null, error: pgError() }));

    await expect(MatchResultDriftService.fetchMatchResultDrift(SEASON_ID)).rejects.toBeInstanceOf(
      DatabaseError
    );
  });

  it('throws a DatabaseError when the match read fails', async () => {
    mockFrom.mockReturnValueOnce(chain({ data: null, error: pgError() }));

    await expect(MatchResultDriftService.fetchMatchResultDrift(SEASON_ID)).rejects.toBeInstanceOf(
      DatabaseError
    );
  });

  it('throws a DatabaseError when the round read fails', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: [matchRow()], error: null }))
      .mockReturnValueOnce(chain({ data: [gameRow()], error: null }))
      .mockReturnValueOnce(chain({ data: null, error: pgError() }));

    await expect(MatchResultDriftService.fetchMatchResultDrift(SEASON_ID)).rejects.toBeInstanceOf(
      DatabaseError
    );
  });
});
