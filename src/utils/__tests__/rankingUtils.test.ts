import { describe, expect, it } from 'vitest';

import { Ranking } from '@/types';
import { sortRankings } from '@/utils/rankingUtils';

const makeRanking = (overrides: Partial<Ranking> = {}): Ranking => ({
  teamId: 'team-1',
  teamName: 'Team One',
  wins: 0,
  losses: 0,
  winPercentage: 0,
  gamesWon: 0,
  gamesLost: 0,
  gameWinPercentage: 0,
  sos: 0,
  powerScore: 0,
  headToHead: {},
  closeMatchLosses: 0,
  ...overrides,
});

describe('sortRankings', () => {
  describe('powerScore tiebreakers for NULL-NULL pairs (regression)', () => {
    it('breaks NULL-NULL ties by division tier, then win%, then team name', () => {
      const teams: Ranking[] = [
        makeRanking({
          teamId: 'rec-team',
          teamName: 'Zebra',
          powerScore: null as unknown as number,
          divisionName: 'Recreational',
          winPercentage: 0.8,
        }),
        makeRanking({
          teamId: 'comp-team',
          teamName: 'Alpha',
          powerScore: null as unknown as number,
          divisionName: 'Competitive',
          winPercentage: 0.2,
        }),
        makeRanking({
          teamId: 'int-team',
          teamName: 'Bravo',
          powerScore: null as unknown as number,
          divisionName: 'Intermediate',
          winPercentage: 0.5,
        }),
      ];

      const sorted = sortRankings(teams, 'powerScore', 'desc');
      const ids = sorted.map((r) => r.teamId);

      // Competitive (tier 1) should be first, then Intermediate (tier 2), then Recreational (tier 3)
      expect(ids).toEqual(['comp-team', 'int-team', 'rec-team']);
    });

    it('breaks NULL-NULL ties by win% when division tier is the same', () => {
      const teams: Ranking[] = [
        makeRanking({
          teamId: 'low-win',
          teamName: 'Low',
          powerScore: null as unknown as number,
          divisionName: 'Competitive',
          winPercentage: 0.2,
        }),
        makeRanking({
          teamId: 'high-win',
          teamName: 'High',
          powerScore: null as unknown as number,
          divisionName: 'Competitive',
          winPercentage: 0.8,
        }),
      ];

      const sorted = sortRankings(teams, 'powerScore', 'desc');
      const ids = sorted.map((r) => r.teamId);

      // Higher win% first
      expect(ids).toEqual(['high-win', 'low-win']);
    });

    it('breaks NULL-NULL ties by team name alphabetically when tier and win% are the same', () => {
      const teams: Ranking[] = [
        makeRanking({
          teamId: 'team-z',
          teamName: 'Zulu',
          powerScore: null as unknown as number,
          divisionName: 'Competitive',
          winPercentage: 0.5,
        }),
        makeRanking({
          teamId: 'team-a',
          teamName: 'Alpha',
          powerScore: null as unknown as number,
          divisionName: 'Competitive',
          winPercentage: 0.5,
        }),
      ];

      const sorted = sortRankings(teams, 'powerScore', 'desc');
      const names = sorted.map((r) => r.teamName);

      expect(names).toEqual(['Alpha', 'Zulu']);
    });

    it('still places NULL power scores after non-NULL ones', () => {
      const teams: Ranking[] = [
        makeRanking({
          teamId: 'null-team',
          teamName: 'Null Team',
          powerScore: null as unknown as number,
          divisionName: 'Competitive',
          winPercentage: 1.0,
        }),
        makeRanking({
          teamId: 'scored-team',
          teamName: 'Scored Team',
          powerScore: 10,
          divisionName: 'Recreational',
          winPercentage: 0,
        }),
      ];

      const sorted = sortRankings(teams, 'powerScore', 'desc');
      const ids = sorted.map((r) => r.teamId);

      expect(ids).toEqual(['scored-team', 'null-team']);
    });
  });

  describe('general behavior', () => {
    it('sorts by powerScore descending', () => {
      const teams: Ranking[] = [
        makeRanking({ teamId: 'mid', powerScore: 50 }),
        makeRanking({ teamId: 'high', powerScore: 90 }),
        makeRanking({ teamId: 'low', powerScore: 20 }),
      ];

      const sorted = sortRankings(teams, 'powerScore', 'desc');
      expect(sorted.map((r) => r.teamId)).toEqual(['high', 'mid', 'low']);
    });

    it('sorts by teamName ascending', () => {
      const teams: Ranking[] = [
        makeRanking({ teamId: 'b', teamName: 'Bravo' }),
        makeRanking({ teamId: 'a', teamName: 'Alpha' }),
      ];

      const sorted = sortRankings(teams, 'teamName', 'asc');
      expect(sorted.map((r) => r.teamName)).toEqual(['Alpha', 'Bravo']);
    });
  });
});
