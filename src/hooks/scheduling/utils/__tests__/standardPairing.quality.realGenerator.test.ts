import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchTeamsByIds } from '@/services/matches/MatchTeamLookupService';
import type { TeamPair } from '@/types/autoSchedule';
import { ValidationError } from '@/types/errors';
import type { Team } from '@/types/team';
import { createQualityCompatibility } from '@/utils/autoSchedule/compatibilityUtils';
import { BACK_TO_BACK_PAIRS } from '@/utils/autoSchedule/constants';
import { type RatingRow, ratingRow } from '@/utils/test/autoSchedule/qualityHelpers';
import { seededRandom } from '@/utils/test/autoSchedule/seededRandom';
import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import { scheduleStandardPairings } from '../standardPairing';

// Only the network and the logger are faked. The Blossom generator is the real one. These tests
// run what standardPairing.realGenerator.test.ts runs, with Prioritize Match Quality ON.
vi.mock('@/services/matches/SchedulingHistoryService', () => ({
  fetchSeasonHistoryForTeams: vi.fn(),
  haveTeamsPlayedBefore: vi.fn(),
}));

vi.mock('@/services/matches/MatchTeamLookupService', () => ({
  fetchTeamsByIds: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  debugLog: vi.fn(),
  errorLog: vi.fn(),
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
}));

const OFF = { avoidRematches: true };
const SCREEN_WEIGHTS = {
  powerScoreWeight: 5,
  sosWeight: 3,
  recordWeight: 3.5,
  gameRecordWeight: 2,
};
const ON = { avoidRematches: true, weights: SCREEN_WEIGHTS };

/** `count` teams with ids and names `<prefix>1`, `<prefix>2` and so on, all in one division. */
const makeTeams = (prefix: string, count: number): Team[] =>
  Array.from({ length: count }, (_, index) =>
    createMockTeam({ id: `${prefix}${index + 1}`, name: `${prefix}${index + 1}` })
  );

/** Each pair as team1, team2, score and rematch flag, in the order the generator returned them. */
const describePairs = (pairings: TeamPair[] | undefined) =>
  (pairings ?? []).map(
    (pairing) =>
      `${pairing.team1.id}|${pairing.team2.id}|${pairing.compatibilityScore}|${pairing.hasPlayedBefore}`
  );

const pairKey = (pairing: TeamPair) => [pairing.team1.id, pairing.team2.id].sort().join('-');

/** How many matches each team plays in one block, in the order of `teams`. */
const matchesPerTeam = (pairings: TeamPair[] | undefined, teams: Team[]) => {
  const counts = new Map(teams.map((team) => [team.id, 0]));
  for (const pairing of pairings ?? []) {
    counts.set(pairing.team1.id, (counts.get(pairing.team1.id) ?? 0) + 1);
    counts.set(pairing.team2.id, (counts.get(pairing.team2.id) ?? 0) + 1);
  }
  return teams.map((team) => counts.get(team.id));
};

/** Every team gets the same ratings, whichever ids are asked for. */
const rateEveryoneTheSame = () =>
  vi
    .mocked(fetchTeamsByIds)
    .mockImplementation((ids) => Promise.resolve(ids.map((id) => ratingRow(id))));

describe('scheduleStandardPairings with Prioritize Match Quality ON and the real generator', () => {
  beforeEach(() => {
    rateEveryoneTheSame();
  });

  describe('when every team has the same ratings, the night is the one the switch OFF gives', () => {
    const mixedDivisions = [
      'Competitive',
      'Intermediate',
      'Recreational',
      'Cuspers',
      'Recreational High',
      null,
    ].map((divisionName, index) =>
      createMockTeam({ id: `A${index + 1}`, name: `A${index + 1}`, divisionName })
    );
    const unsortedSix = ['A4', 'A1', 'A6', 'A3', 'A5', 'A2'].map((id) =>
      createMockTeam({ id, name: id })
    );

    // Every block of standardPairing.realGenerator.test.ts, as a table, except the 6 teams from
    // mixed divisions. That one block no longer gives the same list with ON (see below).
    const nights: Array<{
      name: string;
      blocks: Record<string, Team[]>;
      history?: [string, string][];
    }> = [
      { name: '4 teams in one block', blocks: { Early: makeTeams('A', 4) } },
      { name: '6 teams in one block', blocks: { Early: makeTeams('A', 6) } },
      { name: '8 teams in one block', blocks: { Early: makeTeams('A', 8) } },
      {
        name: 'an Early block of 4 and a Mid block of 6',
        blocks: { Early: makeTeams('A', 4), Mid: makeTeams('B', 6) },
      },
      {
        name: 'a double header of 6 teams',
        blocks: { Early: makeTeams('A', 6), Late: makeTeams('A', 6) },
      },
      {
        name: 'a double header of 4 teams, with two forced repeats',
        blocks: { Early: makeTeams('A', 4), Late: makeTeams('A', 4) },
      },
      {
        name: 'nine block keys, seven empty',
        blocks: {
          ...Object.fromEntries(Object.keys(BACK_TO_BACK_PAIRS).map((block) => [block, []])),
          Early: makeTeams('A', 6),
        },
      },
      {
        name: 'a lone team beside a block of 4',
        blocks: { Early: makeTeams('A', 4), Mid: makeTeams('L', 1) },
      },
      { name: 'a block of 2', blocks: { Early: makeTeams('A', 2) } },
      {
        name: 'a block of 2 beside blocks of 4 and 6',
        blocks: { Early: makeTeams('A', 4), Mid: makeTeams('B', 2), Late: makeTeams('C', 6) },
      },
      {
        name: 'a block of 2 that already met',
        blocks: { Early: makeTeams('A', 2) },
        history: [['A2', 'A1']],
      },
      {
        name: 'blocks of 6 and 8 with two pairs already played',
        blocks: { Early: makeTeams('A', 6), Late: makeTeams('B', 8) },
        history: [
          ['A1', 'A2'],
          ['B3', 'B4'],
        ],
      },
      { name: '6 teams listed out of order', blocks: { Early: unsortedSix } },
    ];

    it.each(nights)(
      'gives the same pairs, scores, order and unmatched list for $name',
      async ({ blocks, history }) => {
        const off = await scheduleStandardPairings(blocks, OFF, history ?? []);
        const on = await scheduleStandardPairings(blocks, ON, history ?? []);

        expect(on).toEqual(off);
        for (const block of Object.keys(off.pairings)) {
          expect(describePairs(on.pairings[block])).toEqual(describePairs(off.pairings[block]));
        }
        expect(on.unmatchedTeamIds).toEqual(off.unmatchedTeamIds);
      }
    );

    // The pins of standardPairing.realGenerator.test.ts, word for word, now with the switch ON.
    it('returns the pinned pairs, in the pinned order, for 4 teams of one division', async () => {
      const result = await scheduleStandardPairings({ Early: makeTeams('A', 4) }, ON, []);

      expect(describePairs(result.pairings.Early)).toEqual([
        'A1|A4|10|false',
        'A2|A3|10|false',
        'A1|A3|10|false',
        'A2|A4|10|false',
      ]);
    });

    // The one block where ON with equal ratings is NOT the OFF list. Teams: A1 Competitive,
    // A2 Intermediate, A3 Recreational, A4 "Cuspers", A5 "Recreational High", A6 no division.
    // The score reads "Cuspers" and a missing division as Recreational, and the hard rule reads
    // them as Intermediate. So A1 (Competitive) has only one real partner (A2): its second
    // match must be a pair that scores 0 (A1-A4 here). Both lists hold exactly that one 0-score
    // pair and nothing else that bends a rule. ON asks each round to pair as many teams as it
    // can, so it picks other partners for the rest and lists the pairs in another order.
    // OFF is the old pinned list, unchanged.
    it('keeps the one forced 0-score pair, and every team on 2 matches, for 6 teams from mixed divisions', async () => {
      const off = await scheduleStandardPairings({ Early: mixedDivisions }, OFF, []);
      const on = await scheduleStandardPairings({ Early: mixedDivisions }, ON, []);

      expect(describePairs(off.pairings.Early)).toEqual([
        'A1|A2|5|false',
        'A1|A4|0|false',
        'A3|A4|10|false',
        'A3|A5|10|false',
        'A5|A6|10|false',
        'A2|A6|5|false',
      ]);
      expect(describePairs(on.pairings.Early)).toEqual([
        'A1|A2|5|false',
        'A3|A6|10|false',
        'A4|A5|10|false',
        'A1|A4|0|false',
        'A2|A6|5|false',
        'A3|A5|10|false',
      ]);
      for (const result of [off, on]) {
        expect(matchesPerTeam(result.pairings.Early, mixedDivisions)).toEqual([2, 2, 2, 2, 2, 2]);
        expect(
          (result.pairings.Early ?? []).filter((pairing) => pairing.compatibilityScore === 0)
        ).toHaveLength(1);
        expect(result.unmatchedTeamIds).toEqual([]);
      }
    });

    it('returns the pinned pairs for 6 teams listed out of order', async () => {
      const result = await scheduleStandardPairings({ Early: unsortedSix }, ON, []);

      expect(describePairs(result.pairings.Early)).toEqual([
        'A4|A2|10|false',
        'A1|A5|10|false',
        'A6|A3|10|false',
        'A4|A5|10|false',
        'A1|A6|10|false',
        'A3|A2|10|false',
      ]);
    });

    it('returns the pinned 4-team block and the pinned lone team', async () => {
      const result = await scheduleStandardPairings(
        { Early: makeTeams('A', 4), Mid: makeTeams('L', 1) },
        ON,
        []
      );

      expect(Object.keys(result.pairings)).toEqual(['Early']);
      expect(result.unmatchedTeamIds).toEqual(['L1']);
      expect(describePairs(result.pairings.Early)).toEqual([
        'A1|A4|10|false',
        'A2|A3|10|false',
        'A1|A3|10|false',
        'A2|A4|10|false',
      ]);
    });

    it('stops on an odd block with the same message, before it reads any ratings', async () => {
      const generate = () => scheduleStandardPairings({ Early: makeTeams('A', 5) }, ON, []);

      await expect(generate()).rejects.toThrow(
        'Block Early Pair (6:30-7:00 PM) has 5 teams. Standard mode needs an even number of teams in a block. Move a team, or use Dual Match Mode on the Auto Schedule screen.'
      );
      await expect(generate()).rejects.toBeInstanceOf(ValidationError);
      expect(fetchTeamsByIds).not.toHaveBeenCalled();
    });
  });

  describe('when the ratings differ', () => {
    // Four Intermediate teams. Each is one step stronger than the one before: 10 Power Score
    // points, 0.1 of strength of schedule, 0.1 of win rate and 0.1 of game win rate.
    const ladder = (id: string, step: number) =>
      ratingRow(id, {
        power_score: 50 + 10 * step,
        sos: 0.5 + 0.1 * step,
        wins: 5 + step,
        losses: 5 - step,
        game_wins: 25 + 5 * step,
        game_losses: 25 - 5 * step,
      });

    it('pairs the closest ratings first: A-B and C-D, then A-C and B-D', async () => {
      const teams = ['A', 'B', 'C', 'D'].map((id) =>
        createMockTeam({ id, name: id, divisionName: 'Intermediate', power_score: 0, sos: 0.5 })
      );
      vi.mocked(fetchTeamsByIds).mockResolvedValue([
        ladder('A', 0),
        ladder('B', 1),
        ladder('C', 2),
        ladder('D', 3),
      ]);

      const on = await scheduleStandardPairings({ Early: teams }, ON, []);
      const off = await scheduleStandardPairings({ Early: teams }, OFF, []);

      // Scores: one step apart 10 - 5/1024, two steps 10 - 20/1024, three steps 10 - 46/1024.
      expect(describePairs(on.pairings.Early)).toEqual([
        'A|B|9.9951171875|false',
        'C|D|9.9951171875|false',
        'A|C|9.98046875|false',
        'B|D|9.98046875|false',
      ]);
      // With the switch OFF the far pairs come first, as the pinned 4-team block shows.
      expect(describePairs(off.pairings.Early)).toEqual([
        'A|D|10|false',
        'B|C|10|false',
        'A|C|10|false',
        'B|D|10|false',
      ]);
      expect(on.unmatchedTeamIds).toEqual([]);
    });

    /** A seeded rating for every team: spread widely, with some teams that have played little. */
    const spreadRatings = (teams: Team[], seed: number): RatingRow[] => {
      const random = seededRandom(seed);
      return teams.map((team) => {
        const decided = Math.floor(random() * 12);
        const wins = Math.floor(random() * (decided + 1));
        return ratingRow(team.id, {
          power_score: Math.round(20 + random() * 75),
          sos: Math.round(random() * 100) / 100,
          wins,
          losses: decided - wins,
          game_wins: wins * 3,
          game_losses: (decided - wins) * 3,
        });
      });
    };

    it.each([4, 6, 8, 12])(
      'gives every team 2 matches, with no repeated pair, in a block of %i Intermediate teams',
      async (count) => {
        const teams = makeTeams('T', count).map((team) => ({
          ...team,
          divisionName: 'Intermediate',
        }));
        vi.mocked(fetchTeamsByIds).mockResolvedValue(spreadRatings(teams, count));

        const result = await scheduleStandardPairings({ Early: teams }, ON, []);

        expect(result.pairings.Early).toHaveLength(count);
        expect(matchesPerTeam(result.pairings.Early, teams)).toEqual(teams.map(() => 2));
        expect(new Set((result.pairings.Early ?? []).map(pairKey)).size).toBe(count);
        expect(result.unmatchedTeamIds).toEqual([]);
      }
    );

    it.each([8, 12])(
      'keeps Competitive teams away from Recreational teams in a mixed block of %i, and repeats nothing',
      async (count) => {
        const tiers = ['Competitive', 'Competitive', 'Intermediate', 'Intermediate'];
        const teams = makeTeams('T', count).map((team, index) => ({
          ...team,
          divisionName: [...tiers, 'Recreational', 'Recreational'][index % 6],
        }));
        vi.mocked(fetchTeamsByIds).mockResolvedValue(spreadRatings(teams, count + 100));

        const result = await scheduleStandardPairings({ Early: teams }, ON, []);

        const pairings = result.pairings.Early ?? [];
        expect(matchesPerTeam(pairings, teams)).toEqual(teams.map(() => 2));
        expect(new Set(pairings.map(pairKey)).size).toBe(count);
        expect(pairings.some((pairing) => pairing.hasPlayedBefore)).toBe(false);
        expect(
          pairings.some(
            ({ team1, team2 }) =>
              [team1.divisionName, team2.divisionName].includes('Competitive') &&
              [team1.divisionName, team2.divisionName].includes('Recreational')
          )
        ).toBe(false);
      }
    );
  });

  describe('against a brute-force search on seeded blocks of 4 to 8 teams', () => {
    /** Every way to pair up some of the teams, as the best total weight found. */
    const bestTotal = (
      count: number,
      weight: (first: number, second: number) => number,
      mustPairEveryone: boolean
    ): number => {
      const solve = (left: number[]): number => {
        if (left.length === 0) return 0;
        const [first, ...rest] = left;
        let best = mustPairEveryone ? Number.NEGATIVE_INFINITY : solve(rest);
        rest.forEach((partner, at) => {
          best = Math.max(
            best,
            weight(first, partner) + solve(rest.filter((_, index) => index !== at))
          );
        });
        return best;
      };
      return solve(Array.from({ length: count }, (_, index) => index));
    };

    it('finds the best first round, with every team on 2 matches and nothing repeated, in 200 blocks', async () => {
      const random = seededRandom(2026);
      // No block holds a Competitive and a Recreational team together, so every pair is allowed.
      const tierSets = [
        ['Intermediate'],
        ['Competitive', 'Intermediate'],
        ['Intermediate', 'Recreational'],
      ];
      let checked = 0;

      for (let block = 0; block < 200; block++) {
        const count = 4 + 2 * (block % 3);
        const tiers = tierSets[Math.floor(random() * tierSets.length)];
        const teams = makeTeams('T', count).map((team) => ({
          ...team,
          divisionName: tiers[Math.floor(random() * tiers.length)],
        }));
        const rows = teams.map((team) => {
          const decided = Math.floor(random() * 12);
          const wins = Math.floor(random() * (decided + 1));
          return ratingRow(team.id, {
            power_score: Math.round(20 + random() * 75),
            sos: Math.round(random() * 100) / 100,
            wins,
            losses: decided - wins,
            game_wins: wins * 3 + Math.floor(random() * 3),
            game_losses: (decided - wins) * 3 + Math.floor(random() * 3),
          });
        });
        vi.mocked(fetchTeamsByIds).mockResolvedValue(rows);
        const ratings = new Map(rows.map((row) => [row.team_id ?? '', row]));
        const scoreFn = createQualityCompatibility(ratings, SCREEN_WEIGHTS);

        const result = await scheduleStandardPairings({ Early: teams }, ON, []);

        const pairings = result.pairings.Early ?? [];
        expect(matchesPerTeam(pairings, teams)).toEqual(teams.map(() => 2));
        expect(new Set(pairings.map(pairKey)).size).toBe(count);
        expect(result.unmatchedTeamIds).toEqual([]);

        // The first `count / 2` pairs are the first round. It must carry the best total, when
        // the best matching of any size also pairs every team (a tie would leave a choice).
        const weight = (first: number, second: number) => scoreFn(teams[first], teams[second]);
        const best = bestTotal(count, weight, false);
        if (bestTotal(count, weight, true) !== best) continue;
        const firstRound = pairings.slice(0, count / 2);
        expect(firstRound.reduce((sum, pair) => sum + pair.compatibilityScore, 0)).toBe(best);
        checked++;
      }

      // Most blocks have a perfect best matching, so the comparison really ran.
      expect(checked).toBeGreaterThan(150);
    });
  });
});
