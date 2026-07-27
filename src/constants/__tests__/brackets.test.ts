import { describe, expect, it } from 'vitest';

import { bracketFormSchema } from '@/components/playoffs/form/BracketFormSchema';
import { MAX_BRACKET_TEAMS, MIN_BRACKET_TEAMS } from '@/constants/brackets';
import { BracketValidationService } from '@/services/brackets/validation/BracketValidationService';

/**
 * The bracket team limit used to be written out in six places with three
 * different maximums (32 in the form schema, a dead 64 check in the creation
 * dialog, and a silent 16 fallback in the team picker), while the service layer
 * enforced no upper bound at all. These tests pin every gate to the shared
 * constants so the layers cannot drift apart again.
 */

const VALID_DIVISION = '123e4567-e89b-42d3-a456-426614174000';

const teamIds = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => `123e4567-e89b-42d3-a456-${String(i).padStart(12, '0')}`);

describe('bracket team limits', () => {
  it('are a sane, bracket-shaped range', () => {
    expect(MIN_BRACKET_TEAMS).toBe(2);
    // brackets-manager rounds up to the next power of two, so the maximum
    // should itself be a power of two or the top slot is unreachable.
    expect(Number.isInteger(Math.log2(MAX_BRACKET_TEAMS))).toBe(true);
    expect(MAX_BRACKET_TEAMS).toBeGreaterThan(MIN_BRACKET_TEAMS);
  });

  describe('form schema', () => {
    const parse = (count: number) =>
      bracketFormSchema.safeParse({
        title: 'Playoffs',
        divisionId: VALID_DIVISION,
        format: 'Double Elimination',
        teams: teamIds(count),
        grandFinalType: 'double',
      });

    it('accepts the minimum and the maximum', () => {
      expect(parse(MIN_BRACKET_TEAMS).success).toBe(true);
      expect(parse(MAX_BRACKET_TEAMS).success).toBe(true);
    });

    it('rejects one below the minimum and one above the maximum', () => {
      expect(parse(MIN_BRACKET_TEAMS - 1).success).toBe(false);
      expect(parse(MAX_BRACKET_TEAMS + 1).success).toBe(false);
    });
  });

  describe('service-layer validation', () => {
    const validate = (count: number) =>
      BracketValidationService.validateFormData({
        title: 'Playoffs',
        divisionId: VALID_DIVISION,
        format: 'double_elimination',
        teams: teamIds(count),
      });

    it('agrees with the form schema at both bounds', () => {
      expect(validate(MIN_BRACKET_TEAMS).isValid).toBe(true);
      expect(validate(MAX_BRACKET_TEAMS).isValid).toBe(true);
      expect(validate(MIN_BRACKET_TEAMS - 1).isValid).toBe(false);
      expect(validate(MAX_BRACKET_TEAMS + 1).isValid).toBe(false);
    });
  });
});
