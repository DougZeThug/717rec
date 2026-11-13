import { describe, expect, it, vi } from 'vitest';

import type { TeamPair } from '@/types/autoSchedule';
import type { Team } from '@/types/team';
import { BACK_TO_BACK_PAIRS } from '@/utils/autoSchedule/constants';
import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import { scheduleStandardPairings } from '../standardPairing';

// Only the network and the logger are faked here. The Blossom generator is the real one,
// so these tests show what a night of blocks really produces. (standardPairing.test.ts
// fakes the generator and checks the wiring.)
vi.mock('@/services/matches/SchedulingHistoryService', () => ({
  fetchSeasonHistoryForTeams: vi.fn(),
  haveTeamsPlayedBefore: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  debugLog: vi.fn(),
  errorLog: vi.fn(),
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
}));

const config = { avoidRematches: true };

/** `count` teams with ids and names `<prefix>1`, `<prefix>2` and so on, all in one division. */
const makeTeams = (prefix: string, count: number): Team[] =>
  Array.from({ length: count }, (_, index) =>
    createMockTeam({ id: `${prefix}${index + 1}`, name: `${prefix}${index + 1}` })
  );

/** The two ids sorted, so A-vs-B and B-vs-A are the same pair. */
const pairKey = (pairing: TeamPair) => [pairing.team1.id, pairing.team2.id].sort().join('-');

/** Each pair as team1, team2, score and rematch flag, in the order the generator returned them. */
const describePairs = (pairings: TeamPair[] | undefined) =>
  (pairings ?? []).map(
    (pairing) =>
      `${pairing.team1.id}|${pairing.team2.id}|${pairing.compatibilityScore}|${pairing.hasPlayedBefore}`
  );

/** How many matches each team plays in one block, in the order of `teams`. */
const matchesPerTeam = (pairings: TeamPair[] | undefined, teams: Team[]) => {
  const counts = new Map(teams.map((team) => [team.id, 0]));
  for (const pairing of pairings ?? []) {
    counts.set(pairing.team1.id, (counts.get(pairing.team1.id) ?? 0) + 1);
    counts.set(pairing.team2.id, (counts.get(pairing.team2.id) ?? 0) + 1);
  }
  return teams.map((team) => counts.get(team.id));
};

describe('scheduleStandardPairings with the real Blossom generator', () => {
  it.each([4, 6, 8])(
    "gives every team two matches and lists nobody as unmatched with %i teams in one block (today's behaviour)",
    async (count) => {
      const teams = makeTeams('A', count);

      const result = await scheduleStandardPairings({ Early: teams }, config, []);

      // Pairings are keyed by the block name, and nothing else is added.
      expect(Object.keys(result.pairings)).toEqual(['Early']);
      const pairings = result.pairings.Early ?? [];
      expect(pairings).toHaveLength(count);
      expect(matchesPerTeam(pairings, teams)).toEqual(teams.map(() => 2));
      // No pair meets twice inside the block.
      expect(new Set(pairings.map(pairKey)).size).toBe(count);
      expect(result.unmatchedTeamIds).toEqual([]);
    }
  );

  it("pairs an Early block of 4 and a Mid block of 6 independently (today's behaviour)", async () => {
    const early = makeTeams('A', 4);
    const mid = makeTeams('B', 6);

    const result = await scheduleStandardPairings({ Early: early, Mid: mid }, config, []);

    expect(Object.keys(result.pairings)).toEqual(['Early', 'Mid']);
    expect(matchesPerTeam(result.pairings.Early, early)).toEqual(early.map(() => 2));
    expect(matchesPerTeam(result.pairings.Mid, mid)).toEqual(mid.map(() => 2));
    // Nobody in one block is paired with a team from the other.
    expect((result.pairings.Early ?? []).every((p) => p.team1.id.startsWith('A'))).toBe(true);
    expect((result.pairings.Mid ?? []).every((p) => p.team1.id.startsWith('B'))).toBe(true);
    expect(result.unmatchedTeamIds).toEqual([]);
  });

  it("never repeats a pair across the two blocks of a double header of 6 teams (today's behaviour)", async () => {
    // Six teams have 15 possible pairs and the two blocks need 12, so every pair can be new.
    const teams = makeTeams('A', 6);

    const result = await scheduleStandardPairings({ Early: teams, Late: teams }, config, []);

    expect(Object.keys(result.pairings)).toEqual(['Early', 'Late']);
    expect(matchesPerTeam(result.pairings.Early, teams)).toEqual(teams.map(() => 2));
    expect(matchesPerTeam(result.pairings.Late, teams)).toEqual(teams.map(() => 2));
    const allKeys = [...(result.pairings.Early ?? []), ...(result.pairings.Late ?? [])].map(
      pairKey
    );
    expect(new Set(allKeys).size).toBe(allKeys.length);
    expect(
      [...(result.pairings.Early ?? []), ...(result.pairings.Late ?? [])].some(
        (p) => p.hasPlayedBefore
      )
    ).toBe(false);
    expect(result.unmatchedTeamIds).toEqual([]);
  });

  it("repeats two pairs, flagged as rematches, in a double header of 4 teams (today's behaviour)", async () => {
    // Four teams have only 6 possible pairs and the two blocks need 8, so two repeats are forced.
    // The generator relaxes the rematch rule for them and flags them. Nobody is left unmatched.
    const teams = makeTeams('A', 4);

    const result = await scheduleStandardPairings({ Early: teams, Late: teams }, config, []);

    expect(matchesPerTeam(result.pairings.Early, teams)).toEqual(teams.map(() => 2));
    expect(matchesPerTeam(result.pairings.Late, teams)).toEqual(teams.map(() => 2));
    const earlyKeys = new Set((result.pairings.Early ?? []).map(pairKey));
    const repeatedInLate = (result.pairings.Late ?? []).filter((p) => earlyKeys.has(pairKey(p)));
    expect(repeatedInLate).toHaveLength(2);
    expect(repeatedInLate.every((p) => p.hasPlayedBefore)).toBe(true);
    expect((result.pairings.Early ?? []).some((p) => p.hasPlayedBefore)).toBe(false);
    expect(result.unmatchedTeamIds).toEqual([]);
  });

  it("adds nothing for the empty blocks when all 9 block keys are present (today's behaviour)", async () => {
    const nineBlocks: Record<string, Team[]> = Object.fromEntries(
      Object.keys(BACK_TO_BACK_PAIRS).map((block) => [block, []])
    );
    const teams = makeTeams('A', 6);

    const night = await scheduleStandardPairings({ ...nineBlocks, Early: teams }, config, []);
    const emptyNight = await scheduleStandardPairings(nineBlocks, config, []);

    expect(Object.keys(nineBlocks)).toHaveLength(9);
    expect(Object.keys(night.pairings)).toEqual(['Early']);
    expect(matchesPerTeam(night.pairings.Early, teams)).toEqual(teams.map(() => 2));
    expect(night.unmatchedTeamIds).toEqual([]);
    expect(emptyNight.pairings).toEqual({});
    expect(emptyNight.unmatchedTeamIds).toEqual([]);
  });

  it('counts a lone team as unmatched and leaves the 4-team block exactly as it was', async () => {
    const lone = makeTeams('L', 1);

    const result = await scheduleStandardPairings(
      { Early: makeTeams('A', 4), Mid: lone },
      config,
      []
    );

    // The one-team block gets no entry and no pairing. Its team is named as unmatched.
    expect(Object.keys(result.pairings)).toEqual(['Early']);
    expect(result.unmatchedTeamIds).toEqual(['L1']);
    // The 4-team block is the same list as the 4-team pin below.
    expect(describePairs(result.pairings.Early)).toEqual([
      'A1|A4|10|false',
      'A2|A3|10|false',
      'A1|A3|10|false',
      'A2|A4|10|false',
    ]);
  });

  it('counts only the lone team when 9 block keys are present and 7 are empty', async () => {
    const nineBlocks: Record<string, Team[]> = Object.fromEntries(
      Object.keys(BACK_TO_BACK_PAIRS).map((block) => [block, []])
    );
    const early = makeTeams('A', 6);

    const result = await scheduleStandardPairings(
      { ...nineBlocks, Early: early, Late: makeTeams('L', 1) },
      config,
      []
    );

    expect(Object.keys(result.pairings)).toEqual(['Early']);
    expect(matchesPerTeam(result.pairings.Early, early)).toEqual(early.map(() => 2));
    expect(result.unmatchedTeamIds).toEqual(['L1']);
  });

  it("gives the same result when the same night is generated twice (today's behaviour)", async () => {
    const early = makeTeams('A', 6);
    const late = makeTeams('B', 8);
    const history: [string, string][] = [
      ['A1', 'A2'],
      ['B3', 'B4'],
    ];

    const first = await scheduleStandardPairings({ Early: early, Late: late }, config, history);
    const second = await scheduleStandardPairings({ Early: early, Late: late }, config, history);

    expect(second).toEqual(first);
    expect(describePairs(second.pairings.Early)).toEqual(describePairs(first.pairings.Early));
    expect(describePairs(second.pairings.Late)).toEqual(describePairs(first.pairings.Late));
  });

  // These two pin the exact output of the real matcher for a fixed input: which team is
  // listed first, the pair order, the score and the rematch flag. Any change to how a block
  // is built or ordered shows up here.
  it("returns the same pairs in the same order for 4 teams of one division (today's behaviour)", async () => {
    const result = await scheduleStandardPairings({ Early: makeTeams('A', 4) }, config, []);

    expect(describePairs(result.pairings.Early)).toEqual([
      'A1|A4|10|false',
      'A2|A3|10|false',
      'A1|A3|10|false',
      'A2|A4|10|false',
    ]);
  });

  it("returns the same pairs, scores and order for 6 teams from mixed divisions (today's behaviour)", async () => {
    const divisions = [
      'Competitive',
      'Intermediate',
      'Recreational',
      'Cuspers',
      'Recreational High',
      null,
    ];
    const teams = divisions.map((divisionName, index) =>
      createMockTeam({ id: `A${index + 1}`, name: `A${index + 1}`, divisionName })
    );

    const result = await scheduleStandardPairings({ Early: teams }, config, []);

    expect(describePairs(result.pairings.Early)).toEqual([
      'A1|A2|5|false',
      'A1|A4|0|false',
      'A3|A4|10|false',
      'A3|A5|10|false',
      'A5|A6|10|false',
      'A2|A6|5|false',
    ]);
    expect(result.unmatchedTeamIds).toEqual([]);
  });

  it("hands the generator the teams in the order they are listed, not sorted (today's behaviour)", async () => {
    // Real blocks list teams in whatever order they were loaded, and the matcher sees that order.
    const teams = ['A4', 'A1', 'A6', 'A3', 'A5', 'A2'].map((id) =>
      createMockTeam({ id, name: id })
    );

    const result = await scheduleStandardPairings({ Early: teams }, config, []);

    expect(describePairs(result.pairings.Early)).toEqual([
      'A4|A2|10|false',
      'A1|A5|10|false',
      'A6|A3|10|false',
      'A4|A5|10|false',
      'A1|A6|10|false',
      'A3|A2|10|false',
    ]);
    expect(matchesPerTeam(result.pairings.Early, teams)).toEqual(teams.map(() => 2));
  });
});
