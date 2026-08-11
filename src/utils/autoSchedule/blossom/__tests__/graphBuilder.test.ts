import { afterEach, describe, expect, it, vi } from 'vitest';

import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import {
  buildEdgesWithRelaxationLevel,
  buildWeightedGraph,
  buildWeightedGraphWithRelaxation,
  createEdgeMap,
  filterUsedEdges,
} from '../graphBuilder';
import type { TeamPairingConfig } from '../types';

const teams = [
  createMockTeam({ id: 'comp', name: 'Comp', divisionName: 'Competitive' }),
  createMockTeam({ id: 'mid', name: 'Mid', divisionName: 'Intermediate' }),
  createMockTeam({ id: 'rec', name: 'Rec', divisionName: 'Recreational' }),
];
const config: TeamPairingConfig = {
  avoidRematches: true,
  haveTeamsPlayedFn: vi.fn(),
  getCompatibilityScoreFn: () => 10,
  playedPairsSet: new Set(['comp-mid']),
};

afterEach(() => vi.resetAllMocks());

describe('graphBuilder', () => {
  it('applies tier and rematch constraints to the base graph', () => {
    expect(buildWeightedGraph(teams, config).map((edge) => edge.pairingKey)).toEqual(['mid-rec']);
  });

  it('relaxes rematches at level one and extreme tiers at level two', () => {
    expect(buildEdgesWithRelaxationLevel(teams, config, 0)).toHaveLength(1);
    expect(buildEdgesWithRelaxationLevel(teams, config, 1).map((edge) => edge.pairingKey)).toEqual([
      'comp-mid',
      'mid-rec',
    ]);
    const relaxed = buildEdgesWithRelaxationLevel(teams, config, 2);
    expect(relaxed).toHaveLength(3);
    expect(relaxed.find((edge) => edge.pairingKey === 'comp-rec')?.weight).toBe(-90);
  });

  it('relaxes constraints only for teams at risk', () => {
    const edges = buildWeightedGraphWithRelaxation(teams, config, new Set(['comp']), 2);
    expect(edges.map((edge) => edge.pairingKey)).toEqual(['comp-mid', 'comp-rec', 'mid-rec']);
  });

  it('creates lookup maps and removes prior pairings', () => {
    const edges = buildEdgesWithRelaxationLevel(teams, config, 2);
    expect(createEdgeMap(edges).get('comp-mid')).toBe(edges[0]);
    expect(
      filterUsedEdges(edges, [{ team1: teams[1], team2: teams[0] }] as never).map(
        (edge) => edge.pairingKey
      )
    ).not.toContain('comp-mid');
  });

  it('returns an empty graph for infeasible single-team input', () => {
    expect(buildWeightedGraph([teams[0]], config)).toEqual([]);
  });
});
