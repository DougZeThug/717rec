import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Ranking } from '@/types';

vi.mock('@/services/rankings/RankingPersistenceService', () => ({
  saveRankingsToDatabase: vi.fn(),
  loadRankingsFromDatabase: vi.fn(),
  migrateLocalStorageToDatabase: vi.fn(),
}));

import {
  loadRankingsFromDatabase,
  migrateLocalStorageToDatabase,
  saveRankingsToDatabase,
} from '@/services/rankings/RankingPersistenceService';

// Import through the barrel so index.ts re-exports are exercised too.
import {
  loadRankingsFromStorage,
  saveRankingsToStorage,
  sortRankings,
  updateRankChanges,
} from '../index';

const ranking = (overrides: Partial<Ranking> = {}): Ranking =>
  ({
    teamId: 'team-1',
    teamName: 'Team One',
    wins: 0,
    losses: 0,
    winPercentage: 0,
    gamesWon: 0,
    gamesLost: 0,
    gameWinPercentage: 0,
    sos: 0.5,
    powerScore: 50,
    headToHead: {},
    closeMatchLosses: 0,
    ...overrides,
  }) as Ranking;

describe('sortRankings (field/direction branches)', () => {
  const teams = [
    ranking({ teamId: 'a', teamName: 'Alpha', wins: 2, winPercentage: 0.4, sos: 0.7, powerScore: 55 }),
    ranking({ teamId: 'b', teamName: 'Bravo', wins: 8, winPercentage: 0.9, sos: 0.5, powerScore: 80 }),
    ranking({ teamId: 'c', teamName: 'Charlie', wins: 5, winPercentage: 0.6, sos: 0.9, powerScore: 65 }),
  ];

  it('sorts by winPercentage descending', () => {
    const result = sortRankings(teams, 'winPercentage', 'desc');
    expect(result.map((r) => r.teamId)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by winPercentage ascending', () => {
    const result = sortRankings(teams, 'winPercentage', 'asc');
    expect(result.map((r) => r.teamId)).toEqual(['a', 'c', 'b']);
  });

  it('sorts by sos descending', () => {
    const result = sortRankings(teams, 'sos', 'desc');
    expect(result.map((r) => r.teamId)).toEqual(['c', 'a', 'b']);
  });

  it('sorts by wins descending', () => {
    const result = sortRankings(teams, 'wins', 'desc');
    expect(result.map((r) => r.teamId)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by teamName ascending (alphabetical)', () => {
    const result = sortRankings(teams, 'teamName', 'asc');
    expect(result.map((r) => r.teamName)).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('sorts by teamName descending (reverse alphabetical)', () => {
    const result = sortRankings(teams, 'teamName', 'desc');
    expect(result.map((r) => r.teamName)).toEqual(['Charlie', 'Bravo', 'Alpha']);
  });

  it('falls back to powerScore for an unknown sort field', () => {
    const result = sortRankings(teams, 'somethingElse', 'desc');
    expect(result.map((r) => r.teamId)).toEqual(['b', 'c', 'a']);
  });

  it('does not mutate the input array', () => {
    const input = [...teams];
    sortRankings(input, 'wins', 'asc');
    expect(input.map((r) => r.teamId)).toEqual(['a', 'b', 'c']);
  });

  it('sorts powerScore ascending while keeping nulls at the end', () => {
    const result = sortRankings(
      [
        ranking({ teamId: 'null-team', powerScore: null as unknown as number }),
        ranking({ teamId: 'high', powerScore: 80 }),
        ranking({ teamId: 'low', powerScore: 20 }),
      ],
      'powerScore',
      'asc'
    );
    expect(result.map((r) => r.teamId)).toEqual(['low', 'high', 'null-team']);
  });

  it('keeps nulls last in descending powerScore order too', () => {
    const result = sortRankings(
      [
        ranking({ teamId: 'high', powerScore: 80 }),
        ranking({ teamId: 'null-team', powerScore: null as unknown as number }),
        ranking({ teamId: 'low', powerScore: 20 }),
      ],
      'powerScore',
      'desc'
    );
    expect(result.map((r) => r.teamId)).toEqual(['high', 'low', 'null-team']);
  });

  it('applies tiebreakers when both powerScores are null (division tier first)', () => {
    const result = sortRankings(
      [
        ranking({
          teamId: 'rec',
          teamName: 'Rec Team',
          divisionName: 'Recreational',
          powerScore: null as unknown as number,
        }),
        ranking({
          teamId: 'comp',
          teamName: 'Comp Team',
          divisionName: 'Competitive',
          powerScore: null as unknown as number,
        }),
      ],
      'powerScore',
      'desc'
    );
    expect(result.map((r) => r.teamId)).toEqual(['comp', 'rec']);
  });

  it('breaks powerScore ties in the same tier by win percentage', () => {
    const result = sortRankings(
      [
        ranking({
          teamId: 'lower-win',
          divisionName: 'Intermediate',
          powerScore: 60,
          winPercentage: 0.4,
        }),
        ranking({
          teamId: 'higher-win',
          divisionName: 'Intermediate',
          powerScore: 60,
          winPercentage: 0.8,
        }),
      ],
      'powerScore',
      'desc'
    );
    expect(result.map((r) => r.teamId)).toEqual(['higher-win', 'lower-win']);
  });

  it('breaks powerScore + tier + win% ties alphabetically by team name', () => {
    const result = sortRankings(
      [
        ranking({
          teamId: 'z',
          teamName: 'Zebras',
          divisionName: 'Intermediate',
          powerScore: 60,
          winPercentage: 0.5,
        }),
        ranking({
          teamId: 'a',
          teamName: 'Aardvarks',
          divisionName: 'Intermediate',
          powerScore: 60,
          winPercentage: 0.5,
        }),
      ],
      'powerScore',
      'desc'
    );
    expect(result.map((r) => r.teamName)).toEqual(['Aardvarks', 'Zebras']);
  });

  it('treats powerScores as equal when they round to the same displayed value', () => {
    const result = sortRankings(
      [
        ranking({
          teamId: 'lower-win',
          divisionName: 'Intermediate',
          powerScore: 60.04, // displays as 60.0
          winPercentage: 0.3,
        }),
        ranking({
          teamId: 'higher-win',
          divisionName: 'Intermediate',
          powerScore: 60.01, // displays as 60.0
          winPercentage: 0.9,
        }),
      ],
      'powerScore',
      'desc'
    );
    // Raw scores differ, but rounded display values tie → win% tiebreaker wins
    expect(result.map((r) => r.teamId)).toEqual(['higher-win', 'lower-win']);
  });

  it('returns 0 (stable) for exact ties on non-powerScore fields', () => {
    const result = sortRankings(
      [
        ranking({ teamId: 'first', wins: 4 }),
        ranking({ teamId: 'second', wins: 4 }),
      ],
      'wins',
      'desc'
    );
    expect(result.map((r) => r.teamId)).toEqual(['first', 'second']);
  });
});

describe('updateRankChanges', () => {
  it('computes rankChange from previousRank and new position', () => {
    const result = updateRankChanges([
      ranking({ teamId: 'up', previousRank: 3 }), // now rank 1 → +2
      ranking({ teamId: 'down', previousRank: 1 }), // now rank 2 → -1
      ranking({ teamId: 'same', previousRank: 3 }), // now rank 3 → 0
    ]);
    expect(result[0].rankChange).toBe(2);
    expect(result[1].rankChange).toBe(-1);
    expect(result[2].rankChange).toBe(0);
  });

  it('leaves rankChange at 0 when previousRank is undefined', () => {
    const result = updateRankChanges([ranking({ teamId: 'new-team' })]);
    expect(result[0].rankChange).toBe(0);
  });
});

describe('saveRankingsToStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const twoRankings = [ranking({ teamId: 't1' }), ranking({ teamId: 't2' })];

  it('persists to database and localStorage by default', async () => {
    vi.mocked(saveRankingsToDatabase).mockResolvedValue(undefined as never);

    await saveRankingsToStorage(twoRankings, 'season-1');

    expect(saveRankingsToDatabase).toHaveBeenCalledWith(twoRankings, 'season-1');
    expect(JSON.parse(localStorage.getItem('previousRankings') ?? '{}')).toEqual({
      t1: 1,
      t2: 2,
    });
    expect(localStorage.getItem('rankingsLastUpdated')).toBeTruthy();
  });

  it('skips the database when persistToDatabase is false but still saves locally', async () => {
    await saveRankingsToStorage(twoRankings, 'season-1', { persistToDatabase: false });

    expect(saveRankingsToDatabase).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('previousRankings') ?? '{}')).toEqual({
      t1: 1,
      t2: 2,
    });
  });

  it('still saves to localStorage when the database save fails', async () => {
    vi.mocked(saveRankingsToDatabase).mockRejectedValue(new Error('db down'));

    await expect(saveRankingsToStorage(twoRankings, 'season-1')).resolves.toBeUndefined();

    expect(JSON.parse(localStorage.getItem('previousRankings') ?? '{}')).toEqual({
      t1: 1,
      t2: 2,
    });
  });

  it('swallows localStorage failures instead of throwing', async () => {
    vi.mocked(saveRankingsToDatabase).mockResolvedValue(undefined as never);
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota exceeded');
      });

    try {
      await expect(saveRankingsToStorage(twoRankings)).resolves.toBeUndefined();
    } finally {
      setItemSpy.mockRestore();
    }
  });
});

describe('loadRankingsFromStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('returns database rankings when available', async () => {
    vi.mocked(loadRankingsFromDatabase).mockResolvedValue({ t1: 1, t2: 2 });

    const result = await loadRankingsFromStorage('season-1');

    expect(loadRankingsFromDatabase).toHaveBeenCalledWith('season-1');
    expect(result.rankings).toEqual({ t1: 1, t2: 2 });
    expect(result.lastUpdated).toBeTruthy();
    expect(migrateLocalStorageToDatabase).not.toHaveBeenCalled();
  });

  it('migrates localStorage data when the database is empty', async () => {
    localStorage.setItem('previousRankings', JSON.stringify({ t1: 1 }));
    vi.mocked(loadRankingsFromDatabase)
      .mockResolvedValueOnce({}) // first check: DB empty
      .mockResolvedValueOnce({ t1: 1 }); // after migration
    vi.mocked(migrateLocalStorageToDatabase).mockResolvedValue(undefined as never);

    const result = await loadRankingsFromStorage();

    expect(migrateLocalStorageToDatabase).toHaveBeenCalledTimes(1);
    expect(result.rankings).toEqual({ t1: 1 });
  });

  it('falls back to localStorage when migration yields nothing', async () => {
    localStorage.setItem('previousRankings', JSON.stringify({ t9: 9 }));
    localStorage.setItem('rankingsLastUpdated', '2026-01-01T00:00:00.000Z');
    vi.mocked(loadRankingsFromDatabase).mockResolvedValue({});
    vi.mocked(migrateLocalStorageToDatabase).mockResolvedValue(undefined as never);

    const result = await loadRankingsFromStorage();

    expect(result.rankings).toEqual({ t9: 9 });
    expect(result.lastUpdated).toBe('2026-01-01T00:00:00.000Z');
  });

  it('returns empty rankings when database and localStorage are both empty', async () => {
    vi.mocked(loadRankingsFromDatabase).mockResolvedValue({});

    const result = await loadRankingsFromStorage();

    expect(result.rankings).toEqual({});
    expect(result.lastUpdated).toBeNull();
    expect(migrateLocalStorageToDatabase).not.toHaveBeenCalled();
  });

  it('falls back to localStorage when the database load throws', async () => {
    localStorage.setItem('previousRankings', JSON.stringify({ t5: 5 }));
    localStorage.setItem('rankingsLastUpdated', '2026-02-02T00:00:00.000Z');
    vi.mocked(loadRankingsFromDatabase).mockRejectedValue(new Error('db offline'));

    const result = await loadRankingsFromStorage();

    expect(result.rankings).toEqual({ t5: 5 });
    expect(result.lastUpdated).toBe('2026-02-02T00:00:00.000Z');
  });

  it('returns a safe empty result when even localStorage is corrupted', async () => {
    localStorage.setItem('previousRankings', 'not-valid-json{');
    vi.mocked(loadRankingsFromDatabase).mockRejectedValue(new Error('db offline'));

    const result = await loadRankingsFromStorage();

    expect(result).toEqual({ rankings: {}, lastUpdated: null });
  });
});
