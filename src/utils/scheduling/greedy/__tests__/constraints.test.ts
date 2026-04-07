import { describe, expect, it } from 'vitest';

import { Team } from '@/types';

import { canPlay, countValidOpponents, getTier, tierDistance } from '../constraints';
import { pairKey } from '../pairKey';

function makeTeam(id: string, divisionName: string): Team {
  return {
    id,
    name: `Team ${id}`,
    division_id: `div-${id}`,
    divisionName,
    logo_url: null,
    image_url: null,
    players: [],
    wins: 0,
    losses: 0,
    game_wins: 0,
    game_losses: 0,
    seed: null,
    created_at: new Date().toISOString(),
    challonge_participant_id: null,
    spotify_url: null,
  } as Team;
}

describe('constraints', () => {
  describe('getTier', () => {
    it('maps Competitive to tier 1', () => {
      expect(getTier(makeTeam('1', 'Competitive'))).toBe(1);
    });

    it('maps Intermediate to tier 2', () => {
      expect(getTier(makeTeam('1', 'Intermediate'))).toBe(2);
    });

    it('maps Recreational to tier 3', () => {
      expect(getTier(makeTeam('1', 'Recreational'))).toBe(3);
    });

    it('extracts tier number from "Tier 2" format', () => {
      expect(getTier(makeTeam('1', 'Tier 2'))).toBe(2);
    });

    it('defaults unknown division to tier 2', () => {
      expect(getTier(makeTeam('1', 'Mystery Division'))).toBe(2);
    });

    it('handles empty divisionName', () => {
      expect(getTier(makeTeam('1', ''))).toBe(2);
    });
  });

  describe('tierDistance', () => {
    it('returns 0 for same tier', () => {
      expect(tierDistance(makeTeam('1', 'Competitive'), makeTeam('2', 'Competitive'))).toBe(0);
    });

    it('returns 1 for adjacent tiers', () => {
      expect(tierDistance(makeTeam('1', 'Competitive'), makeTeam('2', 'Intermediate'))).toBe(1);
    });

    it('returns 2 for extreme tiers', () => {
      expect(tierDistance(makeTeam('1', 'Competitive'), makeTeam('2', 'Recreational'))).toBe(2);
    });
  });

  describe('canPlay', () => {
    const teamA = makeTeam('a', 'Competitive');
    const teamB = makeTeam('b', 'Competitive');
    const teamC = makeTeam('c', 'Recreational');

    it('blocks session rematches at all levels', () => {
      const tonightPairs = new Set([pairKey('a', 'b')]);
      expect(canPlay(teamA, teamB, new Set(), tonightPairs, 1, 0)).toBe(false);
      expect(canPlay(teamA, teamB, new Set(), tonightPairs, 1, 1)).toBe(false);
      expect(canPlay(teamA, teamB, new Set(), tonightPairs, 1, 2)).toBe(false);
      expect(canPlay(teamA, teamB, new Set(), tonightPairs, 1, 3)).toBe(false);
    });

    it('blocks tier gap > maxTierGap at level 0', () => {
      expect(canPlay(teamA, teamC, new Set(), new Set(), 1, 0)).toBe(false);
    });

    it('allows cross-tier at level 1', () => {
      expect(canPlay(teamA, teamC, new Set(), new Set(), 1, 1)).toBe(true);
    });

    it('blocks season rematches at level 0', () => {
      const playedSet = new Set([pairKey('a', 'b')]);
      expect(canPlay(teamA, teamB, playedSet, new Set(), 1, 0)).toBe(false);
    });

    it('blocks season rematches at level 1', () => {
      const playedSet = new Set([pairKey('a', 'b')]);
      expect(canPlay(teamA, teamB, playedSet, new Set(), 1, 1)).toBe(false);
    });

    it('allows season rematches at level 2', () => {
      const playedSet = new Set([pairKey('a', 'b')]);
      expect(canPlay(teamA, teamB, playedSet, new Set(), 1, 2)).toBe(true);
    });

    it('allows everything except session rematches at level 3', () => {
      const playedSet = new Set([pairKey('a', 'c')]);
      expect(canPlay(teamA, teamC, playedSet, new Set(), 1, 3)).toBe(true);
    });

    it('allows season rematch via rematchAllowedFor at level 0', () => {
      const playedSet = new Set([pairKey('a', 'b')]);
      const rematchAllowedFor = new Set(['a']);
      expect(canPlay(teamA, teamB, playedSet, new Set(), 1, 0, rematchAllowedFor)).toBe(true);
    });

    it('rematchAllowedFor does not override session rematches', () => {
      const tonightPairs = new Set([pairKey('a', 'b')]);
      const rematchAllowedFor = new Set(['a']);
      expect(canPlay(teamA, teamB, new Set(), tonightPairs, 1, 0, rematchAllowedFor)).toBe(false);
    });

    it('allows when no constraints are violated', () => {
      expect(canPlay(teamA, teamB, new Set(), new Set(), 1, 0)).toBe(true);
    });
  });

  describe('countValidOpponents', () => {
    const teams = [
      makeTeam('1', 'Competitive'),
      makeTeam('2', 'Competitive'),
      makeTeam('3', 'Intermediate'),
      makeTeam('4', 'Recreational'),
    ];

    it('counts opponents excluding self and excludeId', () => {
      const count = countValidOpponents(
        teams[0], teams, '2', new Set(), new Set(), 1, 0
      );
      // team 1 can play team 3 (tier gap 1), cannot play team 4 (tier gap 2)
      // team 2 is excluded
      expect(count).toBe(1);
    });

    it('counts all valid opponents when no exclusions conflict', () => {
      const count = countValidOpponents(
        teams[0], teams, 'nobody', new Set(), new Set(), 1, 0
      );
      // team 2 (same tier), team 3 (gap 1) = 2. team 4 (gap 2) blocked
      expect(count).toBe(2);
    });
  });
});
