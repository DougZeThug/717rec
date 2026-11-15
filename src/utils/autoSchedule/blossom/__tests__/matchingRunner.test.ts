import edmondsBlossom from 'edmonds-blossom';
import { describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';
import edmondsBlossomStrict from '@/utils/autoSchedule/blossom/vendor/edmondsBlossomStrict';
import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import { runBlossomMatching } from '../matchingRunner';
import type { Edge } from '../types';

// Both libraries stay real. Each one is wrapped in a spy that calls the real code, so the tests
// below can see which one runBlossomMatching picks.
vi.mock('edmonds-blossom', async () => {
  const actual = await vi.importActual<{ default: typeof edmondsBlossom }>('edmonds-blossom');
  return { default: vi.fn(actual.default) };
});

vi.mock('@/utils/autoSchedule/blossom/vendor/edmondsBlossomStrict', async () => {
  const actual = await vi.importActual<{ default: typeof edmondsBlossomStrict }>(
    '@/utils/autoSchedule/blossom/vendor/edmondsBlossomStrict'
  );
  return { default: vi.fn(actual.default) };
});

vi.mock('@/utils/logger', () => ({
  debugLog: vi.fn(),
  errorLog: vi.fn(),
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
}));

const [teamA, teamB, teamC, teamD] = ['A', 'B', 'C', 'D'].map((id) =>
  createMockTeam({ id, name: id })
);

const edge = (first: Team, second: Team, weight: number): Edge => ({
  team1: first,
  team2: second,
  weight,
  rawScore: weight,
  hasPlayedBefore: false,
  pairingKey: [first.id, second.id].sort().join('-'),
});

// A path: A-B (1), B-C (100), C-D (1). One edge of 100 beats two edges of 1 plus 1.
const pathEdges = [edge(teamA, teamB, 1), edge(teamB, teamC, 100), edge(teamC, teamD, 1)];
const pathTeams = [teamA, teamB, teamC, teamD];

const describePairs = (pairings: ReturnType<typeof runBlossomMatching>) =>
  pairings.map((pairing) => `${pairing.team1.id}-${pairing.team2.id}`);

describe('runBlossomMatching on a path A-B-C-D with weights 1, 100, 1', () => {
  it('keeps the single heaviest pair by default and leaves two teams out', () => {
    expect(describePairs(runBlossomMatching(pathTeams, pathEdges, 1))).toEqual(['B-C']);
    expect(describePairs(runBlossomMatching(pathTeams, pathEdges, 1, false))).toEqual(['B-C']);
  });

  it('pairs all four teams when it must match as many teams as it can', () => {
    expect(describePairs(runBlossomMatching(pathTeams, pathEdges, 1, true))).toEqual([
      'A-B',
      'C-D',
    ]);
  });
});

describe('runBlossomMatching: which library it calls', () => {
  // The edge list runBlossomMatching builds from pathEdges (team index, team index, weight).
  const pathEdgeList = [
    [0, 1, 1],
    [1, 2, 100],
    [2, 3, 1],
  ];

  it('calls the original library, and not the copy, by default', () => {
    runBlossomMatching(pathTeams, pathEdges, 1);

    expect(edmondsBlossom).toHaveBeenCalledTimes(1);
    expect(edmondsBlossom).toHaveBeenCalledWith(pathEdgeList, false);
    expect(edmondsBlossomStrict).not.toHaveBeenCalled();
  });

  it('calls the original library, and not the copy, when maxCardinality is false', () => {
    runBlossomMatching(pathTeams, pathEdges, 1, false);

    expect(edmondsBlossom).toHaveBeenCalledTimes(1);
    expect(edmondsBlossomStrict).not.toHaveBeenCalled();
  });

  it('calls the strict-mode copy, and not the original, when maxCardinality is true', () => {
    runBlossomMatching(pathTeams, pathEdges, 1, true);

    expect(edmondsBlossomStrict).toHaveBeenCalledTimes(1);
    expect(edmondsBlossomStrict).toHaveBeenCalledWith(pathEdgeList, true);
    expect(edmondsBlossom).not.toHaveBeenCalled();
  });
});
