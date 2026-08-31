import { describe, expect, it, vi } from 'vitest';

import { transformBracketsManagerData } from '../transformBracketData';

vi.mock('@/utils/logger', () => ({ bracketLog: vi.fn() }));

const baseInput = {
  bracket: {
    id: 'b-1',
    title: 'Summer Finals',
    format: 'Double Elimination',
    state: 'pending',
    division_id: 'd-1',
    divisions: { display_division: 'Competitive', name: 'Comp A' },
  },
  stageId: 7,
  participants: [],
  groups: [],
  matches: [],
  teamDetails: [],
};

describe('transformBracketsManagerData', () => {
  it('carries the division id through', () => {
    const result = transformBracketsManagerData(baseInput);

    // The dialog that re-files a bracket needs the id, not the display name.
    // Dropping it here made a rename clear the bracket's division.
    expect(result.divisionId).toBe('d-1');
  });

  it('keeps the display name separate from the id', () => {
    const result = transformBracketsManagerData(baseInput);

    expect(result.division).toBe('Competitive');
    expect(result.divisionId).toBe('d-1');
  });

  it('reports a missing division id as null rather than undefined', () => {
    const result = transformBracketsManagerData({
      ...baseInput,
      bracket: { ...baseInput.bracket, division_id: null },
    });

    expect(result.divisionId).toBeNull();
  });
});
