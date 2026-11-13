import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchSeasonHistoryForTeams } from '@/services/matches/SchedulingHistoryService';
import { ValidationError } from '@/types/errors';
import type { Team } from '@/types/team';
import { generatePairingsWithBlossom } from '@/utils/autoSchedule/blossom';
import { BACK_TO_BACK_PAIRS } from '@/utils/autoSchedule/constants';
import { warnLog } from '@/utils/logger';
import { createMockTeam, createMockTeamPairing } from '@/utils/test/autoSchedule/testHelpers';

import { scheduleStandardPairings } from '../standardPairing';

vi.mock('@/utils/autoSchedule/blossom', () => ({
  generatePairingsWithBlossom: vi.fn(),
}));

// Both history functions are stand-ins with their own identity, so the test can tell
// the right one from the wrong one.
vi.mock('@/services/matches/SchedulingHistoryService', () => ({
  fetchSeasonHistoryForTeams: vi.fn(),
  haveTeamsPlayedBefore: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
}));

const teams = ['team-a', 'team-b', 'team-c', 'team-d'].map((id) =>
  createMockTeam({ id, name: id })
);
const [teamA, teamB, teamC, teamD] = teams;

/** The advice that ends the odd-block message, word for word. */
const STANDARD_MODE_ADVICE =
  'Standard mode needs an even number of teams in a block. ' +
  'Move a team, or use Dual Match Mode on the Auto Schedule screen.';

/** What the call rejects with. The test fails when the call resolves instead. */
const rejectionOf = async (call: Promise<unknown>): Promise<unknown> => {
  try {
    await call;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to reject, but it resolved');
};

/** `count` teams with ids `team-1`, `team-2` and so on. */
const teamsOf = (count: number): Team[] =>
  Array.from({ length: count }, (_, index) =>
    createMockTeam({ id: `team-${index + 1}`, name: `team-${index + 1}` })
  );

/** A pairing of two teams, as the Blossom generator would return it. */
const pair = (first: Team, second: Team) => createMockTeamPairing({ team1: first, team2: second });

/** The config that scheduleStandardPairings handed to the Blossom generator for the first block. */
const firstBlockConfig = () => {
  const call = vi.mocked(generatePairingsWithBlossom).mock.calls[0];
  if (!call) throw new Error('generatePairingsWithBlossom was not called');
  return call[1];
};

describe('scheduleStandardPairings', () => {
  beforeEach(() => {
    vi.mocked(generatePairingsWithBlossom).mockResolvedValue([]);
  });

  it('builds the played-pairs set from the history it is given, whichever team is listed first', async () => {
    // Listed in both orders: the key is the two ids sorted, so order must not matter.
    const historyPairs: [string, string][] = [
      ['team-b', 'team-a'],
      ['team-c', 'team-d'],
    ];

    await scheduleStandardPairings({ '6:30': teams }, { avoidRematches: true }, historyPairs);

    const playedPairsSet = firstBlockConfig().playedPairsSet;
    expect(playedPairsSet).toBeInstanceOf(Set);
    expect([...(playedPairsSet ?? [])].sort()).toEqual(['team-a-team-b', 'team-c-team-d']);
    expect(playedPairsSet?.has('team-b-team-a')).toBe(false);
  });

  it("hands the generator the service's fetchSeasonHistoryForTeams as its history lookup", async () => {
    await scheduleStandardPairings({ '6:30': teams }, { avoidRematches: true }, []);

    expect(firstBlockConfig().fetchSeasonHistoryFn).toBe(fetchSeasonHistoryForTeams);
  });

  it('passes the rematch setting through to the generator', async () => {
    await scheduleStandardPairings({ '6:30': teams }, { avoidRematches: true }, []);

    expect(firstBlockConfig().avoidRematches).toBe(true);
  });

  it('skips a block with fewer than two teams, counts a lone team as unmatched, and still pairs the other blocks', async () => {
    const lateBlockPairing = pair(teamA, teamB);
    vi.mocked(generatePairingsWithBlossom).mockResolvedValueOnce([lateBlockPairing]);

    const result = await scheduleStandardPairings(
      { Early: [], Mid: [teamA], Late: teams },
      { avoidRematches: true },
      []
    );

    // The generator ran once, for the Late block only. The empty and one-team blocks get no entry.
    expect(generatePairingsWithBlossom).toHaveBeenCalledTimes(1);
    expect(vi.mocked(generatePairingsWithBlossom).mock.calls[0]?.[0]).toEqual(teams);
    expect(result.pairings).toEqual({ Late: [lateBlockPairing] });
    // A is the lone team in Mid and is also short in Late (one match): it is listed once.
    // The empty Early block adds nothing. B, C and D are short in Late.
    expect(result.unmatchedTeamIds).toEqual(['team-a', 'team-b', 'team-c', 'team-d']);
    expect(new Set(result.unmatchedTeamIds).size).toBe(result.unmatchedTeamIds.length);
  });

  it('counts the team in a one-team block as unmatched and leaves a full block alone', async () => {
    const loneTeam = createMockTeam({ id: 'team-lone', name: 'team-lone' });
    const fullBlock = [
      pair(teamA, teamB),
      pair(teamC, teamD),
      pair(teamA, teamC),
      pair(teamB, teamD),
    ];
    vi.mocked(generatePairingsWithBlossom).mockResolvedValueOnce(fullBlock);

    const result = await scheduleStandardPairings(
      { Early: [], Mid: [loneTeam], Late: teams },
      { avoidRematches: true },
      []
    );

    // Only the lone team is unmatched. The full block (every team plays twice) adds nobody.
    expect(result.unmatchedTeamIds).toEqual(['team-lone']);
    expect(result.pairings).toEqual({ Late: fullBlock });
    expect(generatePairingsWithBlossom).toHaveBeenCalledTimes(1);
  });

  it('adds nobody to the unmatched list for blocks that are all empty', async () => {
    const result = await scheduleStandardPairings(
      { Early: [], Mid: [], Late: [] },
      { avoidRematches: true },
      []
    );

    expect(generatePairingsWithBlossom).not.toHaveBeenCalled();
    expect(result).toEqual({ pairings: {}, unmatchedTeamIds: [] });
  });

  it('lists a lone team once when it is also short in another block', async () => {
    // C sits alone in Mid, and is also one match short in Late (C and D each reach one match).
    vi.mocked(generatePairingsWithBlossom).mockResolvedValueOnce([
      pair(teamA, teamB),
      pair(teamA, teamC),
      pair(teamB, teamD),
    ]);

    const result = await scheduleStandardPairings(
      { Mid: [teamC], Late: teams },
      { avoidRematches: true },
      []
    );

    // First seen order: C from Mid, then D from Late.
    expect(result.unmatchedTeamIds).toEqual(['team-c', 'team-d']);
  });

  it('stops with a clear message on an odd block (3 teams)', async () => {
    // Three teams cannot each play two matches without one team playing twice at the same
    // time, so Save would refuse the night. The scheduler now stops before it generates.
    const error = await rejectionOf(
      scheduleStandardPairings({ Early: [teamA, teamB, teamC] }, { avoidRematches: true }, [])
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toHaveProperty(
      'message',
      `Block Early Pair (6:30-7:00 PM) has 3 teams. ${STANDARD_MODE_ADVICE}`
    );
    // Nothing is generated and the old "odd number of teams" console warning is gone.
    expect(generatePairingsWithBlossom).not.toHaveBeenCalled();
    expect(warnLog).not.toHaveBeenCalled();
  });

  it.each([5, 7, 9])('stops with a clear message on an odd block (%i teams)', async (count) => {
    const error = await rejectionOf(
      scheduleStandardPairings({ Early: teamsOf(count) }, { avoidRematches: true }, [])
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toHaveProperty(
      'message',
      `Block Early Pair (6:30-7:00 PM) has ${count} teams. ${STANDARD_MODE_ADVICE}`
    );
    expect(generatePairingsWithBlossom).not.toHaveBeenCalled();
  });

  it('names every odd block in ONE message, by its time label and team count', async () => {
    // Early (5) and LateMid (3) are odd. Mid (4) is even, Late has one team, SuperLate is empty.
    const error = await rejectionOf(
      scheduleStandardPairings(
        {
          Early: teamsOf(5),
          Mid: teams,
          LateMid: teamsOf(3),
          Late: [teamA],
          SuperLate: [],
        },
        { avoidRematches: true },
        []
      )
    );

    // The whole message, so an even block or the lone team cannot slip in unnoticed.
    expect(error).toHaveProperty(
      'message',
      'Block Early Pair (6:30-7:00 PM) has 5 teams. ' +
        'Block Late Mid Pair (8:00-8:30 PM) has 3 teams. ' +
        STANDARD_MODE_ADVICE
    );
    expect(generatePairingsWithBlossom).not.toHaveBeenCalled();
  });

  it('keeps the error details: which blocks, and how many teams each', async () => {
    const error = await rejectionOf(
      scheduleStandardPairings({ Early: teamsOf(5), Mid: teamsOf(3) }, { avoidRematches: true }, [])
    );

    expect(error).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(error).toHaveProperty('details', {
      oddBlocks: [
        { block: 'Early', teamCount: 5 },
        { block: 'Mid', teamCount: 3 },
      ],
    });
  });

  it('stops even when the odd block comes after an even block, and generates nothing for the even one', async () => {
    // The even block is listed first, so a check inside the loop would already have paired it.
    const error = await rejectionOf(
      scheduleStandardPairings({ Early: teams, Mid: teamsOf(3) }, { avoidRematches: true }, [])
    );

    expect(error).toHaveProperty(
      'message',
      `Block Mid Pair (7:30-8:00 PM) has 3 teams. ${STANDARD_MODE_ADVICE}`
    );
    expect(generatePairingsWithBlossom).not.toHaveBeenCalled();
  });

  it('falls back to the block key when a block has no time label', async () => {
    const error = await rejectionOf(
      scheduleStandardPairings({ '6:30': teamsOf(3) }, { avoidRematches: true }, [])
    );

    expect(error).toHaveProperty('message', `Block 6:30 has 3 teams. ${STANDARD_MODE_ADVICE}`);
  });

  it('does not stop for a lone team beside an even block', async () => {
    const loneTeam = createMockTeam({ id: 'team-lone', name: 'team-lone' });
    const fullBlock = [
      pair(teamA, teamB),
      pair(teamC, teamD),
      pair(teamA, teamC),
      pair(teamB, teamD),
    ];
    vi.mocked(generatePairingsWithBlossom).mockResolvedValueOnce(fullBlock);

    const result = await scheduleStandardPairings(
      { Early: teams, Late: [loneTeam] },
      { avoidRematches: true },
      []
    );

    expect(result.pairings).toEqual({ Early: fullBlock });
    expect(result.unmatchedTeamIds).toEqual(['team-lone']);
  });

  it('does not stop for a block of 2 teams', async () => {
    vi.mocked(generatePairingsWithBlossom).mockResolvedValueOnce([pair(teamA, teamB)]);

    const result = await scheduleStandardPairings(
      { Early: [teamA, teamB] },
      { avoidRematches: true },
      []
    );

    expect(generatePairingsWithBlossom).toHaveBeenCalledTimes(1);
    expect(result.pairings.Early).toHaveLength(1);
  });

  it('does not stop when every block key is present and all are empty', async () => {
    const result = await scheduleStandardPairings(
      Object.fromEntries(Object.keys(BACK_TO_BACK_PAIRS).map((block) => [block, []])),
      { avoidRematches: true },
      []
    );

    expect(generatePairingsWithBlossom).not.toHaveBeenCalled();
    expect(result).toEqual({ pairings: {}, unmatchedTeamIds: [] });
  });

  it("records each block's pairs so the next block sees them as already played (today's behaviour)", async () => {
    const playedPairsSeenByBlock: string[][] = [];
    vi.mocked(generatePairingsWithBlossom).mockImplementation((_blockTeams, blockConfig) => {
      // The set is shared and keeps growing, so copy it at the moment each block asks.
      playedPairsSeenByBlock.push([...(blockConfig.playedPairsSet ?? [])].sort());
      // Only the Early block makes pairings. B is listed before A to check the key is sorted.
      return Promise.resolve(
        playedPairsSeenByBlock.length === 1 ? [pair(teamB, teamA), pair(teamC, teamD)] : []
      );
    });

    // All four teams sit in both blocks, like a double header.
    await scheduleStandardPairings({ Early: teams, Late: teams }, { avoidRematches: true }, [
      ['team-y', 'team-x'],
    ]);

    expect(playedPairsSeenByBlock).toEqual([
      ['team-x-team-y'],
      ['team-a-team-b', 'team-c-team-d', 'team-x-team-y'],
    ]);
  });

  it("lists a team that reached only one match as unmatched and warns with its count (today's behaviour)", async () => {
    // A and B play twice. C and D play once, short of the target of two.
    vi.mocked(generatePairingsWithBlossom).mockResolvedValueOnce([
      pair(teamA, teamB),
      pair(teamA, teamC),
      pair(teamB, teamD),
    ]);

    const result = await scheduleStandardPairings({ Early: teams }, { avoidRematches: true }, []);

    expect(result.unmatchedTeamIds).toEqual(['team-c', 'team-d']);
    expect(warnLog).toHaveBeenCalledTimes(1);
    expect(warnLog).toHaveBeenCalledWith(
      'Block Early has 2 team(s) with fewer than 2 matches: team-c (1/2), team-d (1/2)'
    );
  });

  it('does not list the two teams of a 2-team block as unmatched when they play their one match', async () => {
    // Two teams can meet only once, so one match each is the target for this block.
    vi.mocked(generatePairingsWithBlossom).mockResolvedValueOnce([pair(teamA, teamB)]);

    const result = await scheduleStandardPairings(
      { Early: [teamA, teamB] },
      { avoidRematches: true },
      []
    );

    expect(result.unmatchedTeamIds).toEqual([]);
    expect(warnLog).not.toHaveBeenCalled();
  });

  it('lists both teams of a 2-team block when they get no match', async () => {
    vi.mocked(generatePairingsWithBlossom).mockResolvedValueOnce([]);

    const result = await scheduleStandardPairings(
      { Early: [teamA, teamB] },
      { avoidRematches: true },
      []
    );

    expect(result.unmatchedTeamIds).toEqual(['team-a', 'team-b']);
  });

  it('still needs two matches per team in a block of 4', async () => {
    // A 3-team block no longer reaches this check: it stops early (see the odd-block tests).
    // A plays B and C, C also plays D. B and D play once each, short of the target of two.
    vi.mocked(generatePairingsWithBlossom).mockResolvedValueOnce([
      pair(teamA, teamB),
      pair(teamA, teamC),
      pair(teamC, teamD),
    ]);

    const result = await scheduleStandardPairings({ Early: teams }, { avoidRematches: true }, []);

    expect(result.unmatchedTeamIds).toEqual(['team-b', 'team-d']);
  });

  it("flags a team with no matches as unmatched, and a full block adds nothing (today's behaviour)", async () => {
    vi.mocked(generatePairingsWithBlossom)
      // Early: every team plays twice.
      .mockResolvedValueOnce([
        pair(teamA, teamB),
        pair(teamC, teamD),
        pair(teamA, teamC),
        pair(teamB, teamD),
      ])
      // Late: A, B and C play twice. D plays nobody.
      // Fixture only: the generator is mocked, so the repeated pairs here are not a scenario.
      .mockResolvedValueOnce([pair(teamA, teamB), pair(teamB, teamC), pair(teamC, teamA)]);

    const result = await scheduleStandardPairings(
      { Early: teams, Late: teams },
      { avoidRematches: true },
      []
    );

    expect(result.unmatchedTeamIds).toEqual(['team-d']);
  });

  it('lists a team that is short in two blocks once', async () => {
    // C and D reach only one match in each block, so each is short in both.
    // Fixture only: the real generator throws instead of returning a short block, so a mock
    // is the only way to reach this list.
    const shortBlock = [pair(teamA, teamB), pair(teamA, teamC), pair(teamB, teamD)];
    vi.mocked(generatePairingsWithBlossom)
      .mockResolvedValueOnce(shortBlock)
      .mockResolvedValueOnce(shortBlock);

    const result = await scheduleStandardPairings(
      { Early: teams, Late: teams },
      { avoidRematches: true },
      []
    );

    expect(result.unmatchedTeamIds).toEqual(['team-c', 'team-d']);
  });
});
