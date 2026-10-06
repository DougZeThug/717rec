import { describe, expect, it } from 'vitest';

import { calculateSweepRate } from '../calculateSweepRate';
import { ArchivedMatchData, MatchData, PlayoffMatchData } from '../types';

describe('calculateSweepRate', () => {
  const teamId = 'team-1';

  it('returns zeros when no matches', () => {
    const result = calculateSweepRate({
      regularMatches: [],
      playoffMatches: null,
      teamId,
      totalMatches: 0,
    });

    expect(result).toEqual({
      career_sweeps: 0,
      career_sweep_rate: 0,
    });
  });

  it('detects 2-0 sweep as team1 in regular match', () => {
    const regularMatches: MatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_game_wins: 2,
        team2_game_wins: 0,
        season_id: 'season-1',
      },
    ];

    const result = calculateSweepRate({
      regularMatches,
      playoffMatches: null,
      teamId,
      totalMatches: 1,
    });

    expect(result.career_sweeps).toBe(1);
    expect(result.career_sweep_rate).toBe(100);
  });

  it('detects 2-0 sweep as team2 in regular match', () => {
    const regularMatches: MatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-2',
        team2_id: 'team-1',
        team1_game_wins: 0,
        team2_game_wins: 2,
        season_id: 'season-1',
      },
    ];

    const result = calculateSweepRate({
      regularMatches,
      playoffMatches: null,
      teamId,
      totalMatches: 1,
    });

    expect(result.career_sweeps).toBe(1);
  });

  it('does not count 2-1 win as sweep', () => {
    const regularMatches: MatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_game_wins: 2,
        team2_game_wins: 1,
        season_id: 'season-1',
      },
    ];

    const result = calculateSweepRate({
      regularMatches,
      playoffMatches: null,
      teamId,
      totalMatches: 1,
    });

    expect(result.career_sweeps).toBe(0);
  });

  it('does not count losses as sweeps', () => {
    const regularMatches: MatchData[] = [
      {
        winner_id: 'team-2',
        loser_id: 'team-1',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_game_wins: 0,
        team2_game_wins: 2,
        season_id: 'season-1',
      },
    ];

    const result = calculateSweepRate({
      regularMatches,
      playoffMatches: null,
      teamId,
      totalMatches: 1,
    });

    expect(result.career_sweeps).toBe(0);
  });

  it('detects sweeps in playoff matches', () => {
    const playoffMatches: PlayoffMatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_score: 2,
        team2_score: 0,
        bracket_id: 'bracket-1',
      },
    ];

    const result = calculateSweepRate({
      regularMatches: [],
      playoffMatches,
      teamId,
      totalMatches: 1,
    });

    expect(result.career_sweeps).toBe(1);
  });

  it('skips matches with missing game wins data', () => {
    const regularMatches: MatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_game_wins: null,
        team2_game_wins: null,
        season_id: 'season-1',
      },
    ];

    const result = calculateSweepRate({
      regularMatches,
      playoffMatches: null,
      teamId,
      totalMatches: 1,
    });

    expect(result.career_sweeps).toBe(0);
  });

  it('calculates sweep rate percentage correctly', () => {
    const regularMatches: MatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_game_wins: 2,
        team2_game_wins: 0,
        season_id: 'season-1',
      },
      {
        winner_id: 'team-1',
        loser_id: 'team-3',
        team1_id: 'team-1',
        team2_id: 'team-3',
        team1_game_wins: 2,
        team2_game_wins: 1,
        season_id: 'season-1',
      },
    ];

    const result = calculateSweepRate({
      regularMatches,
      playoffMatches: null,
      teamId,
      totalMatches: 4, // Assuming 4 total matches played
    });

    expect(result.career_sweeps).toBe(1);
    expect(result.career_sweep_rate).toBe(25); // 1/4 = 25%
  });

  it('includes playoff matches in sweep rate denominator', () => {
    const regularMatches: MatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_game_wins: 2,
        team2_game_wins: 0, // 1 regular sweep
        season_id: 'season-1',
      },
      {
        winner_id: 'team-2',
        loser_id: 'team-1',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_game_wins: 0,
        team2_game_wins: 2, // 1 loss
        season_id: 'season-1',
      },
    ];

    const playoffMatches: PlayoffMatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_score: 2,
        team2_score: 0, // 1 playoff sweep
        bracket_id: 'bracket-1',
      },
    ];

    const result = calculateSweepRate({
      regularMatches,
      playoffMatches,
      teamId: 'team-1',
      totalMatches: 3, // 2 regular + 1 playoff (caller must include playoffs in denominator)
    });

    expect(result.career_sweeps).toBe(2); // 1 regular + 1 playoff
    expect(result.career_sweep_rate).toBeCloseTo(66.67, 1); // 2/3 = 66.67%
  });

  describe('edge cases', () => {
    const regular = (overrides: Partial<MatchData> = {}): MatchData => ({
      winner_id: 'team-1',
      loser_id: 'team-2',
      team1_id: 'team-1',
      team2_id: 'team-2',
      team1_game_wins: 2,
      team2_game_wins: 0,
      season_id: 'season-1',
      ...overrides,
    });
    const playoff = (overrides: Partial<PlayoffMatchData> = {}): PlayoffMatchData => ({
      winner_id: 'team-1',
      loser_id: 'team-2',
      team1_id: 'team-1',
      team2_id: 'team-2',
      team1_score: 2,
      team2_score: 0,
      bracket_id: 'bracket-1',
      ...overrides,
    });
    const sweepsOf = (
      regularMatches: (MatchData | ArchivedMatchData)[],
      playoffMatches: PlayoffMatchData[] | null = null
    ) =>
      calculateSweepRate({
        regularMatches,
        playoffMatches,
        teamId,
        totalMatches: 10,
      }).career_sweeps;

    describe('playoff matches', () => {
      it('counts a playoff sweep as team2', () => {
        const match = playoff({
          team1_id: 'team-2',
          team2_id: 'team-1',
          team1_score: 0,
          team2_score: 2,
        });

        expect(sweepsOf([], [match])).toBe(1);
      });

      it.each([
        ['a 2-1 win', { team1_score: 2, team2_score: 1 }],
        ['a 3-0 win', { team1_score: 3, team2_score: 0 }],
        ['a 1-0 win', { team1_score: 1, team2_score: 0 }],
        ['a loss', { winner_id: 'team-2', loser_id: 'team-1', team1_score: 0, team2_score: 2 }],
        ['a win recorded 0-2 from the team side', { team1_score: 0, team2_score: 2 }],
        ['a win by a team in neither slot', { team1_id: 'team-8', team2_id: 'team-9' }],
      ])('does not count %s', (_label, overrides) => {
        expect(sweepsOf([], [playoff(overrides)])).toBe(0);
      });

      it.each([
        ['team1_score is null', { team1_score: null }],
        ['team2_score is null', { team2_score: null }],
        ['both scores are null', { team1_score: null, team2_score: null }],
      ])('skips a playoff match when %s', (_label, overrides) => {
        expect(sweepsOf([], [playoff(overrides)])).toBe(0);
      });

      it('skips a playoff match when the scores are undefined', () => {
        const match = {
          winner_id: 'team-1',
          loser_id: 'team-2',
          team1_id: 'team-1',
          team2_id: 'team-2',
          bracket_id: 'bracket-1',
        } as unknown as PlayoffMatchData;

        expect(sweepsOf([], [match])).toBe(0);
      });

      it('treats an empty playoff list like no playoff list', () => {
        expect(sweepsOf([regular()], [])).toBe(sweepsOf([regular()], null));
        expect(sweepsOf([regular()], [])).toBe(1);
      });
    });

    describe('regular matches', () => {
      it.each([
        ['a 3-0 win', { team1_game_wins: 3, team2_game_wins: 0 }],
        ['a 1-0 win', { team1_game_wins: 1, team2_game_wins: 0 }],
        ['a win recorded 0-2 from the team side', { team1_game_wins: 0, team2_game_wins: 2 }],
        ['a win by a team in neither slot', { team1_id: 'team-8', team2_id: 'team-9' }],
      ])('does not count %s', (_label, overrides) => {
        expect(sweepsOf([regular(overrides)])).toBe(0);
      });

      it.each([
        ['team1_game_wins is null', { team1_game_wins: null }],
        ['team2_game_wins is null', { team2_game_wins: null }],
      ])('skips a match when only one count is missing (%s)', (_label, overrides) => {
        expect(sweepsOf([regular(overrides)])).toBe(0);
      });

      it('skips archived matches whose game wins are undefined', () => {
        const archived = {
          winner_id: 'team-1',
          loser_id: 'team-2',
          team1_id: 'team-1',
          team2_id: 'team-2',
          season_id: 'season-1',
        } as unknown as ArchivedMatchData;

        expect(sweepsOf([archived])).toBe(0);
      });

      it('counts an archived 2-0 sweep', () => {
        const archived: ArchivedMatchData = {
          winner_id: 'team-1',
          loser_id: 'team-2',
          team1_id: 'team-2',
          team2_id: 'team-1',
          team1_game_wins: 0,
          team2_game_wins: 2,
          season_id: 'season-1',
        };

        expect(sweepsOf([archived])).toBe(1);
      });
    });

    it('returns a rate of 0, but still counts sweeps, when totalMatches is 0', () => {
      const result = calculateSweepRate({
        regularMatches: [regular()],
        playoffMatches: null,
        teamId,
        totalMatches: 0,
      });

      expect(result).toEqual({ career_sweeps: 1, career_sweep_rate: 0 });
    });

    it('adds regular and playoff sweeps from a mixed list', () => {
      const result = calculateSweepRate({
        regularMatches: [
          regular(), // sweep as team1
          regular({
            team1_id: 'team-3',
            team2_id: 'team-1',
            team1_game_wins: 0,
            team2_game_wins: 2,
          }), // sweep as team2
          regular({ team2_game_wins: 1 }), // 2-1, no sweep
          regular({
            winner_id: 'team-2',
            loser_id: 'team-1',
            team1_game_wins: 0,
            team2_game_wins: 2,
          }), // loss
          regular({ team1_game_wins: null, team2_game_wins: null }), // no data
        ],
        playoffMatches: [
          playoff(), // sweep
          playoff({ team2_score: 1 }), // 2-1, no sweep
          playoff({ team1_score: null }), // no data
        ],
        teamId,
        totalMatches: 8,
      });

      expect(result.career_sweeps).toBe(3);
      expect(result.career_sweep_rate).toBe(37.5);
    });
  });
});
