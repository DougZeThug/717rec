import { describe, expect, it } from 'vitest';

import { buildGameLines, resolveOfficialWinnerName, resolveWinnerName } from '../matchWinner';

describe('resolveWinnerName (the winner the scoreboard has worked out)', () => {
  it('names the side that won', () => {
    expect(resolveWinnerName(1, 'Rail Riders', 'Bag Bandits')).toBe('Rail Riders');
    expect(resolveWinnerName(2, 'Rail Riders', 'Bag Bandits')).toBe('Bag Bandits');
  });

  it('names nobody while the match is undecided', () => {
    expect(resolveWinnerName(null, 'Rail Riders', 'Bag Bandits')).toBeNull();
  });
});

describe('resolveOfficialWinnerName (the result the server has recorded)', () => {
  it('prefers the recorded winner over the scoreboard', () => {
    expect(resolveOfficialWinnerName('t1', 't1', 't2', 'Rail Riders', 'Bag Bandits', null)).toBe(
      'Rail Riders'
    );
    expect(resolveOfficialWinnerName('t2', 't1', 't2', 'Rail Riders', 'Bag Bandits', null)).toBe(
      'Bag Bandits'
    );
  });

  it('falls back to the scoreboard when no result has been saved', () => {
    expect(
      resolveOfficialWinnerName(null, 't1', 't2', 'Rail Riders', 'Bag Bandits', 'Rail Riders')
    ).toBe('Rail Riders');
  });

  // A recorded winner that matches neither team is not a name we can use.
  it('falls back when the recorded winner is neither team', () => {
    expect(
      resolveOfficialWinnerName('t9', 't1', 't2', 'Rail Riders', 'Bag Bandits', 'Bag Bandits')
    ).toBe('Bag Bandits');
  });
});

describe('buildGameLines (one line per finished game)', () => {
  const game = (gameNumber: number, status: string, winnerId: string | null) => ({
    game: { game_number: gameNumber, status, winner_team_id: winnerId },
    totals: { team1: 21, team2: 15 },
  });

  it('skips games that are still in progress', () => {
    const lines = buildGameLines(
      [game(1, 'completed', 't1'), game(2, 'in_progress', null)],
      't1',
      't2',
      'Rail Riders',
      'Bag Bandits'
    );

    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual({
      gameNumber: 1,
      team1Total: 21,
      team2Total: 15,
      winnerName: 'Rail Riders',
    });
  });

  it('names the second team when it won the game', () => {
    const lines = buildGameLines(
      [game(1, 'completed', 't2')],
      't1',
      't2',
      'Rail Riders',
      'Bag Bandits'
    );

    expect(lines[0].winnerName).toBe('Bag Bandits');
  });

  it('returns nothing when no game has finished', () => {
    expect(buildGameLines([game(1, 'in_progress', null)], 't1', 't2', 'A', 'B')).toEqual([]);
  });

  it('names nobody when a finished game records no winner', () => {
    // Legacy rows on completed matches were marked completed without a winner,
    // and deleting a team empties the column on games already played. The old
    // two-way check credited the second team for both.
    const lines = buildGameLines(
      [game(1, 'completed', null)],
      't1',
      't2',
      'Rail Riders',
      'Bag Bandits'
    );

    expect(lines).toHaveLength(1);
    expect(lines[0].winnerName).toBeNull();
  });

  it('names nobody when the match has no first team either', () => {
    // Both null made the old `winner_team_id === team1Id` check true, so the
    // line credited the first team instead.
    const lines = buildGameLines(
      [game(1, 'completed', null)],
      null,
      null,
      'Rail Riders',
      'Bag Bandits'
    );

    expect(lines[0].winnerName).toBeNull();
  });

  it('names nobody when the winner is not either of these teams', () => {
    const lines = buildGameLines(
      [game(1, 'completed', 't-gone')],
      't1',
      't2',
      'Rail Riders',
      'Bag Bandits'
    );

    expect(lines[0].winnerName).toBeNull();
  });
});
