import { describe, expect, it, vi } from 'vitest';

import type { Match, Team } from '@/types';

vi.mock('../divisionWeightsCache', () => ({ getDefaultDivisionWeight: () => 0.85 }));

import { calculateSOS } from '../calculateSOS';

const team = (id: string, divisionId?: string): Team =>
  ({ id, name: `Team ${id}`, division_id: divisionId }) as Team;
const match = (t1: string, t2: string): Match =>
  ({ id: `${t1}-${t2}`, team1Id: t1, team2Id: t2 }) as Match;

describe('calculateSOS', () => {
  it('returns 0.5 when allTeams is empty', () => {
    expect(calculateSOS(team('t1', 'div-1'), [], [match('t1', 't2')], new Map())).toBe(0.5);
  });

  it('returns 0.5 when the team has no matches', () => {
    const weights = new Map([['div-2', 0.9]]);
    expect(
      calculateSOS(team('t1', 'div-1'), [team('t1'), team('t2', 'div-2')], [], weights)
    ).toBe(0.5);
  });

  it('calculates average division weight across opponents', () => {
    const t1 = team('t1', 'div-1');
    const t2 = team('t2', 'div-2');
    const t3 = team('t3', 'div-3');
    const weights = new Map([
      ['div-2', 0.9],
      ['div-3', 0.7],
    ]);
    const sos = calculateSOS(t1, [t1, t2, t3], [match('t1', 't2'), match('t1', 't3')], weights);
    expect(sos).toBeCloseTo((0.9 + 0.7) / 2);
  });

  it('uses default weight 0.85 when division weight is missing', () => {
    const t1 = team('t1', 'div-1');
    const t2 = team('t2', 'div-2');
    const sos = calculateSOS(t1, [t1, t2], [match('t1', 't2')], new Map());
    expect(sos).toBe(0.85);
  });

  it('counts each unique opponent only once (deduplication)', () => {
    const t1 = team('t1', 'div-1');
    const t2 = team('t2', 'div-2');
    const weights = new Map([['div-2', 0.8]]);
    // Two matches vs same opponent — should not double-weight
    const sos = calculateSOS(t1, [t1, t2], [match('t1', 't2'), match('t1', 't2')], weights);
    expect(sos).toBe(0.8);
  });
});
