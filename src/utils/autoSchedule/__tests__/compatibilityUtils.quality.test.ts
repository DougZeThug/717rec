import { describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';
import { seededRandom } from '@/utils/test/autoSchedule/seededRandom';
import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import {
  calculateDivisionOnlyCompatibility,
  createQualityCompatibility,
  LOWEST_NEIGHBOURING_DIVISION_SCORE,
  type TeamRating,
} from '../compatibilityUtils';

vi.mock('@/utils/logger', () => ({
  debugLog: vi.fn(),
}));

// The four fixed weights both auto-schedule screens send when Prioritize Match Quality is ON.
const SCREEN_WEIGHTS = {
  powerScoreWeight: 5,
  sosWeight: 3,
  recordWeight: 3.5,
  gameRecordWeight: 2,
};

const TIERS = ['Competitive', 'Intermediate', 'Recreational'] as const;

const teamOf = (id: string, divisionName: string): Team =>
  createMockTeam({ id, name: id, divisionName });

/** A mid-table team that has played 10 matches. Pass only what differs. */
const rating = (overrides: Partial<TeamRating> = {}): TeamRating => ({
  power_score: 60,
  sos: 0.5,
  wins: 5,
  losses: 5,
  game_wins: 25,
  game_losses: 25,
  ...overrides,
});

/** The score two teams of one tier get, given their ratings. */
const score = (
  first: TeamRating,
  second: TeamRating,
  weights: Parameters<typeof createQualityCompatibility>[1] = SCREEN_WEIGHTS
) => {
  const ratings = new Map([
    ['first', first],
    ['second', second],
  ]);
  return createQualityCompatibility(ratings, weights)(
    teamOf('first', 'Intermediate'),
    teamOf('second', 'Intermediate')
  );
};

/** The widest gap there is: every one of the four distances is at its maximum. */
const widestApart: [TeamRating, TeamRating] = [
  rating({ power_score: 1, sos: 0, wins: 10, losses: 0, game_wins: 50, game_losses: 0 }),
  rating({ power_score: 150, sos: 1, wins: 0, losses: 10, game_wins: 0, game_losses: 50 }),
];

/** A rating with every kind of hole a real team can have, picked by the seeded random source. */
const randomRating = (random: () => number): TeamRating => {
  const decided = Math.floor(random() * 14);
  const wins = Math.floor(random() * (decided + 1));
  const gamesDecided = decided * 3;
  const gameWins = Math.floor(random() * (gamesDecided + 1));
  const powerRoll = random();
  return {
    power_score: powerRoll < 0.1 ? null : powerRoll < 0.2 ? 0 : Math.round(random() * 1000) / 10,
    sos: random() < 0.1 ? null : random(),
    wins,
    losses: decided - wins,
    game_wins: gameWins,
    game_losses: gamesDecided - gameWins,
  };
};

/** Many pairs of random ratings: every tier pairing, with ratings for both teams. */
const randomPairs = (count: number) => {
  const random = seededRandom(717);
  return Array.from({ length: count }, (_, index) => {
    const tier1 = TIERS[index % 3];
    const tier2 = TIERS[Math.floor(random() * 3)];
    return {
      team1: teamOf('one', tier1),
      team2: teamOf('two', tier2),
      ratings: new Map([
        ['one', randomRating(random)],
        ['two', randomRating(random)],
      ]),
    };
  });
};

describe('createQualityCompatibility', () => {
  describe('when both teams have the same ratings', () => {
    it.each([
      ['Competitive', 'Competitive', 10],
      ['Intermediate', 'Intermediate', 10],
      ['Recreational', 'Recreational', 10],
      ['Competitive', 'Intermediate', 5],
      ['Intermediate', 'Recreational', 5],
      ['Competitive', 'Recreational', 0],
    ])("gives today's division score for %s against %s: %d", (tier1, tier2, expected) => {
      const ratings = new Map([
        ['one', rating()],
        ['two', rating()],
      ]);

      const result = createQualityCompatibility(ratings, SCREEN_WEIGHTS)(
        teamOf('one', tier1),
        teamOf('two', tier2)
      );

      expect(result).toBe(expected);
      expect(result).toBe(
        calculateDivisionOnlyCompatibility(teamOf('one', tier1), teamOf('two', tier2))
      );
    });
  });

  describe('the bands', () => {
    it('takes at most 0.5 off: the widest gap gives 9.5 for one tier, 4.5 for next door, 0 for blocked', () => {
      const ratings = new Map([
        ['one', widestApart[0]],
        ['two', widestApart[1]],
      ]);
      const scoreOf = createQualityCompatibility(ratings, SCREEN_WEIGHTS);

      expect(scoreOf(teamOf('one', 'Intermediate'), teamOf('two', 'Intermediate'))).toBe(9.5);
      expect(scoreOf(teamOf('one', 'Competitive'), teamOf('two', 'Intermediate'))).toBe(4.5);
      expect(scoreOf(teamOf('one', 'Recreational'), teamOf('two', 'Intermediate'))).toBe(4.5);
      expect(scoreOf(teamOf('one', 'Competitive'), teamOf('two', 'Recreational'))).toBe(0);
    });

    it('names the lowest next-door score, and no next-door pair scores under it', () => {
      const ratings = new Map([
        ['one', widestApart[0]],
        ['two', widestApart[1]],
      ]);
      const widest = createQualityCompatibility(ratings, SCREEN_WEIGHTS)(
        teamOf('one', 'Competitive'),
        teamOf('two', 'Intermediate')
      );

      // The batch preview counts a pair under this in its red Warnings badge. The widest gap
      // gives exactly this score, so a next-door pair is never counted by the scorer alone.
      expect(LOWEST_NEIGHBOURING_DIVISION_SCORE).toBe(4.5);
      expect(widest).toBe(LOWEST_NEIGHBOURING_DIVISION_SCORE);
      for (const { team1, team2, ratings: random } of randomPairs(1000)) {
        if (calculateDivisionOnlyCompatibility(team1, team2) !== 5) continue;

        expect(
          createQualityCompatibility(random, SCREEN_WEIGHTS)(team1, team2)
        ).toBeGreaterThanOrEqual(LOWEST_NEIGHBOURING_DIVISION_SCORE);
      }
    });

    it('never lets the bands touch, for 3000 random pairs with holes in their ratings', () => {
      const sameTier: number[] = [];
      const nextDoor: number[] = [];

      for (const { team1, team2, ratings } of randomPairs(3000)) {
        const result = createQualityCompatibility(ratings, SCREEN_WEIGHTS)(team1, team2);
        const base = calculateDivisionOnlyCompatibility(team1, team2);
        if (base === 10) sameTier.push(result);
        if (base === 5) nextDoor.push(result);
        // A blocked pair stays blocked, whatever the ratings say.
        if (base === 0) expect(result).toBe(0);
      }

      expect(sameTier.length).toBeGreaterThan(500);
      expect(nextDoor.length).toBeGreaterThan(500);
      expect(Math.min(...sameTier)).toBeGreaterThanOrEqual(9.5);
      expect(Math.max(...sameTier)).toBeLessThanOrEqual(10);
      expect(Math.min(...nextDoor)).toBeGreaterThanOrEqual(4.5);
      expect(Math.max(...nextDoor)).toBeLessThanOrEqual(5);
      // The worst same-tier pair still beats the best next-door pair.
      expect(Math.min(...sameTier)).toBeGreaterThan(Math.max(...nextDoor));
    });

    it('keeps a blocked pair at 0 even when the ratings are far apart', () => {
      const ratings = new Map([
        ['one', widestApart[0]],
        ['two', widestApart[1]],
      ]);

      const result = createQualityCompatibility(ratings, SCREEN_WEIGHTS)(
        teamOf('one', 'Competitive'),
        teamOf('two', 'Recreational')
      );

      expect(result).toBe(0);
    });

    it('scores a wider gap lower', () => {
      const level = score(rating({ power_score: 60 }), rating({ power_score: 60 }));
      const close = score(rating({ power_score: 60 }), rating({ power_score: 80 }));
      const apart = score(rating({ power_score: 60 }), rating({ power_score: 100 }));

      expect(apart).toBeLessThan(close);
      expect(close).toBeLessThan(level);
      expect(level).toBe(10);
    });

    it('does not tell two teams apart when their gap is under about 6 percent', () => {
      // 1/256 is the smallest step. A gap g takes 0.5 x g^2 off, so it needs g of about 0.0625
      // to reach half a step. 10 Power Score points, with the rest level, is a gap of 0.037.
      expect(score(rating({ power_score: 60 }), rating({ power_score: 70 }))).toBe(10);
    });
  });

  describe('the numbers', () => {
    it('gives the same score whichever team is listed first', () => {
      for (const { team1, team2, ratings } of randomPairs(1000)) {
        const scoreOf = createQualityCompatibility(ratings, SCREEN_WEIGHTS);

        expect(scoreOf(team1, team2)).toBe(scoreOf(team2, team1));
      }
    });

    it('gives a whole number of 1/256 for every score, so the matcher sums stay exact', () => {
      for (const { team1, team2, ratings } of randomPairs(1000)) {
        const result = createQualityCompatibility(ratings, SCREEN_WEIGHTS)(team1, team2);

        expect(Number.isInteger(result * 256)).toBe(true);
      }
    });

    it('depends on how the weights compare to each other, not on their total', () => {
      for (const { team1, team2, ratings } of randomPairs(300)) {
        const doubled = {
          powerScoreWeight: 10,
          sosWeight: 6,
          recordWeight: 7,
          gameRecordWeight: 4,
        };
        const halved = {
          powerScoreWeight: 2.5,
          sosWeight: 1.5,
          recordWeight: 1.75,
          gameRecordWeight: 1,
        };

        const original = createQualityCompatibility(ratings, SCREEN_WEIGHTS)(team1, team2);

        expect(createQualityCompatibility(ratings, doubled)(team1, team2)).toBe(original);
        expect(createQualityCompatibility(ratings, halved)(team1, team2)).toBe(original);
      }
    });

    it('changes when the weights are in a different ratio', () => {
      // Teams that differ only in Power Score (80 points) and only in win rate (0.8).
      const first = rating({ power_score: 10, wins: 9, losses: 1 });
      const second = rating({ power_score: 90, wins: 1, losses: 9 });
      const powerHeavy = { ...SCREEN_WEIGHTS, powerScoreWeight: 20 };
      const recordHeavy = { ...SCREEN_WEIGHTS, recordWeight: 20 };

      expect(score(first, second, powerHeavy)).not.toBe(score(first, second, recordHeavy));
    });

    it('counts the four distances in proportion to their weights', () => {
      // Only Power Score differs: 20 points is 0.2. The weights are 5, 3, 3.5 and 2 (total 13.5),
      // so the gap is 5 x 0.2 / 13.5, and the amount taken off is 0.5 x gap^2 = 0.002743.
      // In 1/256 steps that is 0.70, so one step comes off.
      const result = score(rating({ power_score: 60 }), rating({ power_score: 80 }));

      expect(result).toBe(10 - 1 / 256);
    });

    it('reads each default weight when a key is missing, the same as the old scorer', () => {
      const first = rating({ power_score: 10, wins: 9, losses: 1 });
      const second = rating({ power_score: 90, wins: 1, losses: 9 });

      const withDefaults = score(first, second, { powerScoreWeight: 5 });
      const spelledOut = score(first, second, {
        powerScoreWeight: 5,
        sosWeight: 1.5,
        recordWeight: 2,
        gameRecordWeight: 1,
      });
      const noWeights = score(first, second, {});
      const oldDefaults = score(first, second, {
        powerScoreWeight: 3,
        sosWeight: 1.5,
        recordWeight: 2,
        gameRecordWeight: 1,
      });

      expect(withDefaults).toBe(spelledOut);
      expect(noWeights).toBe(oldDefaults);
    });

    it('takes nothing off when every weight is 0, with no divide by zero', () => {
      const [first, second] = widestApart;
      const zeros = { powerScoreWeight: 0, sosWeight: 0, recordWeight: 0, gameRecordWeight: 0 };

      expect(score(first, second, zeros)).toBe(10);
    });

    it.each([
      ['negative', -3],
      ['not a number', Number.NaN],
      ['infinite', Number.POSITIVE_INFINITY],
    ])(
      'counts a weight that is %s as 0, so it cannot push a score out of its band',
      (_name, bad) => {
        const [first, second] = widestApart;

        const allBad = score(first, second, {
          powerScoreWeight: bad,
          sosWeight: bad,
          recordWeight: bad,
          gameRecordWeight: bad,
        });
        const oneBad = score(first, second, { ...SCREEN_WEIGHTS, powerScoreWeight: bad });
        const withoutPower = score(first, second, { ...SCREEN_WEIGHTS, powerScoreWeight: 0 });

        expect(allBad).toBe(10);
        expect(oneBad).toBe(withoutPower);
      }
    );
  });

  describe('a team with no data for a measure', () => {
    it.each([
      ['no Power Score', null],
      ['a Power Score of 0', 0],
    ])(
      'leaves the Power Score out for a team with %s, as if the two were level',
      (_name, missing) => {
        const noPower = score(rating({ power_score: missing }), rating({ power_score: 95 }));

        expect(noPower).toBe(10);
      }
    );

    it('leaves the Power Score out when the other team is the one without it', () => {
      expect(score(rating({ power_score: 95 }), rating({ power_score: null }))).toBe(10);
    });

    it('leaves strength of schedule, win rate and game rate out for a team with no decided matches', () => {
      // The new team has played nothing. The other team's record is extreme, but it is not
      // compared with nothing. Power Score is level, so the two score as equals.
      const newTeam = rating({ wins: 0, losses: 0, game_wins: 0, game_losses: 0, sos: 0.5 });
      const veteran = rating({ wins: 10, losses: 0, game_wins: 50, game_losses: 0, sos: 1 });

      expect(score(newTeam, veteran)).toBe(10);
      expect(score(veteran, newTeam)).toBe(10);
    });

    it('counts a null win total as 0 when the team has losses', () => {
      const noWins = rating({ wins: null, losses: 10 });

      // 0 of 10 against 0 of 10 is level. 0 of 10 against 10 of 10 is the widest record gap.
      expect(score(noWins, rating({ wins: 0, losses: 10 }))).toBe(10);
      expect(score(noWins, rating({ wins: 10, losses: 0 }))).toBeLessThan(10);
    });

    it('treats a null count as no decided matches', () => {
      const unknown = rating({
        wins: null,
        losses: null,
        game_wins: null,
        game_losses: null,
        sos: null,
      });
      const veteran = rating({ wins: 10, losses: 0, game_wins: 50, game_losses: 0, sos: 1 });

      expect(score(unknown, veteran)).toBe(10);
    });

    it('leaves strength of schedule out when it is null or not a real number', () => {
      expect(score(rating({ sos: null }), rating({ sos: 0.9 }))).toBe(10);
      expect(score(rating({ sos: Number.NaN }), rating({ sos: 0.9 }))).toBe(10);
    });

    it('counts game results on their own when only the game record is missing', () => {
      // Both teams have match records (level) but only one has game results: the game term
      // is skipped, and the level match record means no gap at all.
      const noGames = rating({ game_wins: 0, game_losses: 0 });

      expect(score(noGames, rating({ game_wins: 50, game_losses: 0 }))).toBe(10);
    });

    it('does not dilute the gap with the measures it skipped', () => {
      // Neither team has played, so only Power Score is compared: 60 against 80 is a gap of 0.2
      // and 0.5 x 0.2^2 = 0.02, which is 5.12 steps of 1/256. If the skipped measures were
      // counted as 0 the gap would be 0.074 and one step would come off, not five.
      const unplayed = { wins: 0, losses: 0, game_wins: 0, game_losses: 0 };

      const result = score(
        rating({ ...unplayed, power_score: 60 }),
        rating({ ...unplayed, power_score: 80 })
      );

      expect(result).toBe(10 - 5 / 256);
    });

    it('scores a team that has no rating at all as the division-only score', () => {
      const ratings = new Map([['one', widestApart[0]]]);
      const scoreOf = createQualityCompatibility(ratings, SCREEN_WEIGHTS);

      expect(scoreOf(teamOf('one', 'Intermediate'), teamOf('missing', 'Intermediate'))).toBe(10);
      expect(scoreOf(teamOf('missing', 'Intermediate'), teamOf('one', 'Recreational'))).toBe(5);
      expect(
        createQualityCompatibility(new Map(), SCREEN_WEIGHTS)(
          teamOf('a', 'Competitive'),
          teamOf('b', 'Competitive')
        )
      ).toBe(10);
    });

    it('reads ratings from the map, not from the Team objects', () => {
      // The Team objects the scheduler holds carry placeholders (Power Score 0, SOS 0.5).
      // Values on the Team must make no difference.
      const ratings = new Map([
        ['one', rating({ power_score: 50 })],
        ['two', rating({ power_score: 80 })],
      ]);
      const plain = createQualityCompatibility(ratings, SCREEN_WEIGHTS)(
        teamOf('one', 'Intermediate'),
        teamOf('two', 'Intermediate')
      );

      const loaded = createQualityCompatibility(ratings, SCREEN_WEIGHTS)(
        createMockTeam({ id: 'one', divisionName: 'Intermediate', power_score: 99, sos: 0.99 }),
        createMockTeam({ id: 'two', divisionName: 'Intermediate', power_score: 1, sos: 0.01 })
      );

      expect(loaded).toBe(plain);
    });
  });

  describe('four Intermediate teams, each a step stronger than the one before', () => {
    // Each step is 10 Power Score points, 0.1 of strength of schedule, 0.1 of win rate and
    // 0.1 of game win rate, so the gap is 0.1 per step. A step takes 0.5 x 0.1^2 = 0.005 off,
    // which is 1.28 steps of 1/256, so 1 comes off. Two steps: 0.02 = 5.12, so 5 come off.
    // Three steps: 0.045 = 11.52, so 12 come off.
    const teamA = teamOf('A', 'Intermediate');
    const teamB = teamOf('B', 'Intermediate');
    const teamC = teamOf('C', 'Intermediate');
    const teamD = teamOf('D', 'Intermediate');
    const ratings = new Map([
      [
        'A',
        rating({ power_score: 50, sos: 0.5, wins: 5, losses: 5, game_wins: 25, game_losses: 25 }),
      ],
      [
        'B',
        rating({ power_score: 60, sos: 0.6, wins: 6, losses: 4, game_wins: 30, game_losses: 20 }),
      ],
      [
        'C',
        rating({ power_score: 70, sos: 0.7, wins: 7, losses: 3, game_wins: 35, game_losses: 15 }),
      ],
      [
        'D',
        rating({ power_score: 80, sos: 0.8, wins: 8, losses: 2, game_wins: 40, game_losses: 10 }),
      ],
    ]);
    const scoreOf = createQualityCompatibility(ratings, SCREEN_WEIGHTS);

    it('scores one step apart 9.99609375, two apart 9.98046875 and three apart 9.953125', () => {
      expect(scoreOf(teamA, teamB)).toBe(10 - 1 / 256);
      expect(scoreOf(teamB, teamC)).toBe(10 - 1 / 256);
      expect(scoreOf(teamC, teamD)).toBe(10 - 1 / 256);
      expect(scoreOf(teamA, teamC)).toBe(10 - 5 / 256);
      expect(scoreOf(teamB, teamD)).toBe(10 - 5 / 256);
      expect(scoreOf(teamA, teamD)).toBe(10 - 12 / 256);
    });

    it('prefers A-B with C-D, then A-C with B-D, over the far pairs', () => {
      // Round 1: A-B and C-D (19.9922) beat A-C and B-D (19.9609) and A-D and B-C (19.9492).
      expect(scoreOf(teamA, teamB) + scoreOf(teamC, teamD)).toBeGreaterThan(
        scoreOf(teamA, teamC) + scoreOf(teamB, teamD)
      );
      expect(scoreOf(teamA, teamC) + scoreOf(teamB, teamD)).toBeGreaterThan(
        scoreOf(teamA, teamD) + scoreOf(teamB, teamC)
      );
    });
  });
});
