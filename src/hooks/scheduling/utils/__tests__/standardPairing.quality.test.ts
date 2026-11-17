import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchTeamsByIds } from '@/services/matches/MatchTeamLookupService';
import { BusinessLogicError, DatabaseError, ValidationError } from '@/types/errors';
import type { Team } from '@/types/team';
import { generatePairingsWithBlossom } from '@/utils/autoSchedule/blossom';
import { calculateDivisionOnlyCompatibility } from '@/utils/autoSchedule/compatibilityUtils';
import { ratingRow } from '@/utils/test/autoSchedule/qualityHelpers';
import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import { scheduleStandardPairings } from '../standardPairing';

// The generator is faked here, so these tests check the wiring: which score function the
// generator is handed, and when the ratings are read. (standardPairing.quality.realGenerator.test.ts
// runs the real generator.)
vi.mock('@/utils/autoSchedule/blossom', () => ({
  generatePairingsWithBlossom: vi.fn(),
}));

vi.mock('@/services/matches/SchedulingHistoryService', () => ({
  fetchSeasonHistoryForTeams: vi.fn(),
  haveTeamsPlayedBefore: vi.fn(),
}));

vi.mock('@/services/matches/MatchTeamLookupService', () => ({
  fetchTeamsByIds: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  debugLog: vi.fn(),
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
}));

/** What the two auto-schedule screens send when Prioritize Match Quality is ON. */
const SCREEN_WEIGHTS = {
  powerScoreWeight: 5,
  sosWeight: 3,
  recordWeight: 3.5,
  gameRecordWeight: 2,
};

/** The message an admin reads when the ratings cannot be loaded. */
const RATINGS_FAILED =
  'Could not load the team ratings that Prioritize Match Quality needs. ' +
  'Turn off Prioritize Match Quality and try again.';

const teamsOf = (prefix: string, count: number): Team[] =>
  Array.from({ length: count }, (_, index) =>
    createMockTeam({
      id: `${prefix}${index + 1}`,
      name: `${prefix}${index + 1}`,
      divisionName: 'Intermediate',
      // The placeholders the real team loader sets.
      power_score: 0,
      sos: 0.5,
    })
  );

/** The config that scheduleStandardPairings handed to the generator for block number `call`. */
const generatorConfig = (call = 0) => {
  const args = vi.mocked(generatePairingsWithBlossom).mock.calls[call];
  if (!args) throw new Error(`generatePairingsWithBlossom call ${call} did not happen`);
  return args[1];
};

describe('scheduleStandardPairings with Prioritize Match Quality', () => {
  beforeEach(() => {
    vi.mocked(generatePairingsWithBlossom).mockResolvedValue([]);
  });

  describe('OFF (the screen sent no weights)', () => {
    it('hands the generator the division-only function itself and reads no ratings', async () => {
      await scheduleStandardPairings({ Early: teamsOf('A', 4) }, { avoidRematches: true }, []);

      expect(generatorConfig().getCompatibilityScoreFn).toBe(calculateDivisionOnlyCompatibility);
      expect(fetchTeamsByIds).not.toHaveBeenCalled();
    });

    it('is OFF whatever prioritizeQuality says: only the weights count', async () => {
      await scheduleStandardPairings(
        { Early: teamsOf('A', 4) },
        { avoidRematches: true, prioritizeQuality: true, weights: undefined },
        []
      );

      expect(generatorConfig().getCompatibilityScoreFn).toBe(calculateDivisionOnlyCompatibility);
      expect(fetchTeamsByIds).not.toHaveBeenCalled();
    });

    it('hands the same function to every block and still passes the weights field through', async () => {
      await scheduleStandardPairings(
        { Early: teamsOf('A', 4), Late: teamsOf('B', 4) },
        { avoidRematches: true },
        []
      );

      expect(generatorConfig(0).getCompatibilityScoreFn).toBe(calculateDivisionOnlyCompatibility);
      expect(generatorConfig(1).getCompatibilityScoreFn).toBe(calculateDivisionOnlyCompatibility);
      expect(generatorConfig(0).weights).toBeUndefined();
    });
  });

  describe('ON (the screen sent weights)', () => {
    const early = teamsOf('A', 4);
    const late = teamsOf('B', 4);

    beforeEach(() => {
      vi.mocked(fetchTeamsByIds).mockImplementation((ids) =>
        Promise.resolve(ids.map((id) => ratingRow(id)))
      );
    });

    it('reads the ratings once for every team, with a team in two blocks listed once', async () => {
      const doubleHeader = [early[0], early[1], late[0], late[1]];

      await scheduleStandardPairings(
        { Early: early, Late: doubleHeader },
        { avoidRematches: true, weights: SCREEN_WEIGHTS },
        []
      );

      expect(fetchTeamsByIds).toHaveBeenCalledTimes(1);
      expect(fetchTeamsByIds).toHaveBeenCalledWith(['A1', 'A2', 'A3', 'A4', 'B1', 'B2']);
    });

    it('does not ask for a team that is alone in its block, because it is not paired', async () => {
      await scheduleStandardPairings(
        { Early: early, Mid: teamsOf('L', 1), Late: [] },
        { avoidRematches: true, weights: SCREEN_WEIGHTS },
        []
      );

      expect(fetchTeamsByIds).toHaveBeenCalledTimes(1);
      expect(fetchTeamsByIds).toHaveBeenCalledWith(['A1', 'A2', 'A3', 'A4']);
    });

    it('reads nothing when no block has two teams to pair', async () => {
      const result = await scheduleStandardPairings(
        { Early: teamsOf('L', 1), Late: [] },
        { avoidRematches: true, weights: SCREEN_WEIGHTS },
        []
      );

      expect(fetchTeamsByIds).not.toHaveBeenCalled();
      expect(generatePairingsWithBlossom).not.toHaveBeenCalled();
      expect(result).toEqual({ pairings: {}, unmatchedTeamIds: ['L1'] });
    });

    it('hands every block the same new function, not the division-only one', async () => {
      await scheduleStandardPairings(
        { Early: early, Late: late },
        { avoidRematches: true, weights: SCREEN_WEIGHTS },
        []
      );

      const scoreFn = generatorConfig(0).getCompatibilityScoreFn;
      expect(scoreFn).not.toBe(calculateDivisionOnlyCompatibility);
      expect(generatorConfig(1).getCompatibilityScoreFn).toBe(scoreFn);
      // The weights still travel with the config, as before.
      expect(generatorConfig(0).weights).toEqual(SCREEN_WEIGHTS);
    });

    it('scores a pair on the real ratings and leaves the Team objects as they were', async () => {
      vi.mocked(fetchTeamsByIds).mockResolvedValue([
        ratingRow('A1', { power_score: 50 }),
        ratingRow('A2', { power_score: 60 }),
        ratingRow('A3', { power_score: 95 }),
        ratingRow('A4', { power_score: 70 }),
      ]);
      const before = JSON.stringify(early);

      await scheduleStandardPairings(
        { Early: early },
        { avoidRematches: true, weights: SCREEN_WEIGHTS },
        []
      );

      const scoreFn = generatorConfig().getCompatibilityScoreFn;
      const [a1, a2, a3] = early;
      expect(scoreFn(a1, a2)).toBeGreaterThan(scoreFn(a1, a3));
      // The block the generator received is the very array that was passed in, unchanged.
      expect(vi.mocked(generatePairingsWithBlossom).mock.calls[0]?.[0]).toBe(early);
      expect(JSON.stringify(early)).toBe(before);
      expect(early.every((team) => team.power_score === 0 && team.sos === 0.5)).toBe(true);
    });

    it('takes the first row when the view sends two for one team, and skips a row with no id', async () => {
      vi.mocked(fetchTeamsByIds).mockResolvedValue([
        ratingRow('A1', { power_score: 50 }),
        ratingRow('A1', { power_score: 95 }),
        ratingRow('A2', { power_score: 52 }),
        ratingRow('ignored', { team_id: null, power_score: 99 }),
      ]);

      await scheduleStandardPairings(
        { Early: early },
        { avoidRematches: true, weights: SCREEN_WEIGHTS },
        []
      );

      const scoreFn = generatorConfig().getCompatibilityScoreFn;
      const [a1, a2] = early;
      // A1 (50) and A2 (52) are 2 points apart. Had the second A1 row (95) won, the gap
      // would be 43 points and the score would be lower.
      expect(scoreFn(a1, a2)).toBe(10);
    });

    it('scores a team the view did not return on its division alone', async () => {
      vi.mocked(fetchTeamsByIds).mockResolvedValue([ratingRow('A1', { power_score: 5 })]);

      await scheduleStandardPairings(
        { Early: early },
        { avoidRematches: true, weights: SCREEN_WEIGHTS },
        []
      );

      const scoreFn = generatorConfig().getCompatibilityScoreFn;
      expect(scoreFn(early[0], early[1])).toBe(10);
    });

    it('leaves a null or 0 Power Score out of the score', async () => {
      vi.mocked(fetchTeamsByIds).mockResolvedValue([
        ratingRow('A1', { power_score: null }),
        ratingRow('A2', { power_score: 0 }),
        ratingRow('A3', { power_score: 90 }),
        ratingRow('A4', { power_score: 90 }),
      ]);

      await scheduleStandardPairings(
        { Early: early },
        { avoidRematches: true, weights: SCREEN_WEIGHTS },
        []
      );

      const scoreFn = generatorConfig().getCompatibilityScoreFn;
      const [a1, a2, a3] = early;
      expect(scoreFn(a1, a3)).toBe(10);
      expect(scoreFn(a2, a3)).toBe(10);
    });

    it('still stops on an odd block before it reads any ratings', async () => {
      const generate = () =>
        scheduleStandardPairings(
          { Early: teamsOf('A', 4), Mid: teamsOf('B', 3) },
          { avoidRematches: true, weights: SCREEN_WEIGHTS },
          []
        );

      await expect(generate()).rejects.toBeInstanceOf(ValidationError);
      expect(fetchTeamsByIds).not.toHaveBeenCalled();
      expect(generatePairingsWithBlossom).not.toHaveBeenCalled();
    });
  });

  describe('when the ratings cannot be read', () => {
    it('stops with a message that says to turn Prioritize Match Quality off, and generates nothing', async () => {
      vi.mocked(fetchTeamsByIds).mockRejectedValue(
        new DatabaseError('Failed to fetch teams by IDs', { code: '57014' })
      );

      const generate = () =>
        scheduleStandardPairings(
          { Early: teamsOf('A', 4) },
          { avoidRematches: true, weights: SCREEN_WEIGHTS },
          []
        );

      await expect(generate()).rejects.toThrow(RATINGS_FAILED);
      await expect(generate()).rejects.toBeInstanceOf(BusinessLogicError);
      expect(generatePairingsWithBlossom).not.toHaveBeenCalled();
    });

    it('keeps the original failure in the error details for the log', async () => {
      const cause = new DatabaseError('Failed to fetch teams by IDs');
      vi.mocked(fetchTeamsByIds).mockRejectedValue(cause);

      const error = await scheduleStandardPairings(
        { Early: teamsOf('A', 4) },
        { avoidRematches: true, weights: SCREEN_WEIGHTS },
        []
      ).catch((thrown: unknown) => thrown);

      expect(error).toHaveProperty('details', { cause });
    });

    it('does not ask for ratings, and cannot fail, when the switch is OFF', async () => {
      vi.mocked(fetchTeamsByIds).mockRejectedValue(new DatabaseError('down'));

      const result = await scheduleStandardPairings(
        { Early: teamsOf('A', 4) },
        { avoidRematches: true },
        []
      );

      expect(fetchTeamsByIds).not.toHaveBeenCalled();
      expect(Object.keys(result.pairings)).toEqual(['Early']);
    });
  });
});
