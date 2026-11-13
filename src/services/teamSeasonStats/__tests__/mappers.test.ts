import { describe, expect, it } from 'vitest';

import { buildBracketInfoMap } from '../mappers';

// These tests pin what buildBracketInfoMap does today with the default division
// weight (0.85). They describe the code as it is and claim no league rule.
describe('buildBracketInfoMap', () => {
  const bracketWith = (divisions: { division_weight: number } | null) => ({
    id: 'b1',
    season_id: 's1',
    divisions,
  });

  it("uses 0.85 when the bracket has no division (today's behaviour)", () => {
    expect(buildBracketInfoMap([bracketWith(null)])).toEqual({
      b1: { season_id: 's1', division_weight: 0.85 },
    });
  });

  // A null weight does not type-check, so the cast mirrors what the database can send.
  it.each([
    { label: 'null', weight: null as unknown as number, expected: 0.85 },
    { label: 'missing', weight: undefined as unknown as number, expected: 0.85 },
    { label: '0', weight: 0, expected: 0 },
    { label: '1', weight: 1, expected: 1 },
  ])("division weight $label becomes $expected (today's behaviour)", ({ weight, expected }) => {
    expect(buildBracketInfoMap([bracketWith({ division_weight: weight })])).toEqual({
      b1: { season_id: 's1', division_weight: expected },
    });
  });
});
