import { describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';
import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import { runBlossomMatching } from '../matchingRunner';
import type { Edge } from '../types';

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
  });
});
