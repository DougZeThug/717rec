import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchSeasonHistoryForTeams } from '@/services/matches/SchedulingHistoryService';
import type { Team } from '@/types/team';
import { generatePairingsWithBlossom } from '@/utils/autoSchedule/blossom';
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

  it("skips a block with fewer than two teams and still pairs the other blocks (today's behaviour)", async () => {
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
  });

  // Pins only what this function returns. Whether the save step accepts a 3-team block
  // (every team plays two matches) is a separate question.
  it("warns on an odd block and still pairs (today's behaviour)", async () => {
    // Three teams who each play the other two: every team reaches two matches.
    const triangle = [pair(teamA, teamB), pair(teamA, teamC), pair(teamB, teamC)];
    vi.mocked(generatePairingsWithBlossom).mockResolvedValueOnce(triangle);

    const result = await scheduleStandardPairings(
      { Early: [teamA, teamB, teamC] },
      { avoidRematches: true },
      []
    );

    expect(warnLog).toHaveBeenCalledTimes(1);
    expect(warnLog).toHaveBeenCalledWith(
      expect.stringContaining('Block Early has odd number of teams (3)')
    );
    // The block is not skipped: the generator ran and its pairings are kept.
    expect(generatePairingsWithBlossom).toHaveBeenCalledTimes(1);
    expect(result.pairings).toEqual({ Early: triangle });
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

  it("lists a team that is short in two blocks twice (today's behaviour)", async () => {
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

    expect(result.unmatchedTeamIds).toEqual(['team-c', 'team-d', 'team-c', 'team-d']);
  });
});
