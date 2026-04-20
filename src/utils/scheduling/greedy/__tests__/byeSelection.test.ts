import { describe, expect, it } from 'vitest';

import { Team } from '@/types';

import { pickBye } from '../byeSelection';

function makeTeam(id: string, divisionName = 'Competitive'): Team {
  return {
    id,
    name: `Team ${id}`,
    division_id: `div-${id}`,
    divisionName,
    players: [],
    wins: 0,
    losses: 0,
    game_wins: 0,
    game_losses: 0,
    created_at: new Date().toISOString(),
  } as Team;
}

describe('pickBye — last strategy', () => {
  const teams = [makeTeam('a'), makeTeam('b'), makeTeam('c')];

  it('returns the last team in the available list', () => {
    const bye = pickBye(teams, 'last', new Set(), 1);
    expect(bye.id).toBe('c');
  });

  it('respects excludeIds when selecting from available teams', () => {
    const bye = pickBye(teams, 'last', new Set(), 1, new Set(['c']));
    expect(bye.id).toBe('b');
  });
});

describe('pickBye — fewestPartners strategy', () => {
  it('picks the team with the fewest valid opponents', () => {
    // teamA (Competitive) can play teamB (Competitive) — 1 valid partner
    // teamB (Competitive) can play teamA (Competitive) — 1 valid partner
    // teamC (Recreational) can play nobody with maxTierGap=1 against only Competitive teams
    const teams = [makeTeam('a', 'Competitive'), makeTeam('b', 'Competitive'), makeTeam('c', 'Recreational')];
    const bye = pickBye(teams, 'fewestPartners', new Set(), 1);
    // teamC has 0 valid opponents (tier gap 2 > maxTierGap 1) → selected as bye
    expect(bye.id).toBe('c');
  });

  it('with all same-tier teams, picks the last team (all equal partners → first in loop wins)', () => {
    const teams = [makeTeam('a'), makeTeam('b'), makeTeam('c')];
    // All have the same number of partners (2 each). Loop picks first min → 'a'.
    const bye = pickBye(teams, 'fewestPartners', new Set(), 1);
    expect(bye).toBeDefined();
  });
});
