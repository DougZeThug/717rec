import { describe, expect, it, vi } from 'vitest';

import { ValidationError } from '@/types/errors';

import { BracketValidationService } from '../BracketValidationService';

const VALID_UUID_1 = '123e4567-e89b-42d3-a456-426614174000';
const VALID_UUID_2 = '123e4567-e89b-42d3-b456-426614174001';
const VALID_UUID_3 = '123e4567-e89b-42d3-8456-426614174002';

const validPayload = {
  title: 'Championship Bracket',
  divisionId: VALID_UUID_1,
  format: 'single_elimination',
  teams: [VALID_UUID_2, VALID_UUID_3],
};

describe('BracketValidationService.validateFormData', () => {
  it('returns invalid for invalid structure', () => {
    const result = BracketValidationService.validateFormData(null);

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(['Invalid form data structure']);
  });

  it('returns error for missing or blank title', () => {
    const missingTitle = BracketValidationService.validateFormData({ ...validPayload, title: '' });
    const blankTitle = BracketValidationService.validateFormData({ ...validPayload, title: '   ' });

    expect(missingTitle.isValid).toBe(false);
    expect(missingTitle.errors).toContain('Title is required and cannot be empty');

    expect(blankTitle.isValid).toBe(false);
    expect(blankTitle.errors).toContain('Title is required and cannot be empty');
  });

  it.each([
    [{ ...validPayload, divisionId: '' }, 'Division selection is required'],
    [{ ...validPayload, divisionId: '   ' }, 'Division ID cannot be empty'],
    [{ ...validPayload, divisionId: 123 as unknown as string }, 'Invalid form data structure'],
    [
      { ...validPayload, divisionId: 'not-a-uuid' },
      'Selected division has invalid UUID format: not-a-uuid',
    ],
  ])('returns error for invalid division (%j)', (payload, expectedError) => {
    const result = BracketValidationService.validateFormData(payload);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(expectedError);
  });

  it.each([
    [{ ...validPayload, format: '' }, 'Format selection is required'],
    [{ ...validPayload, format: '   ' }, 'Format selection is required'],
  ])('returns error for missing or blank format (%j)', (payload, expectedError) => {
    const result = BracketValidationService.validateFormData(payload);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(expectedError);
  });

  it.each([
    [{ ...validPayload, teams: [] }, 'At least 2 teams must be selected'],
    [{ ...validPayload, teams: [VALID_UUID_2] }, 'At least 2 teams must be selected'],
  ])('returns error when fewer than 2 teams are provided (%j)', (payload, expectedError) => {
    const result = BracketValidationService.validateFormData(payload);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(expectedError);
  });

  it('returns valid for a fully valid payload', () => {
    const result = BracketValidationService.validateFormData(validPayload);

    expect(result).toEqual({ isValid: true, errors: [] });
  });
});

describe('BracketValidationService.validateTeamSelection', () => {
  it('returns invalid when input is not an array', () => {
    const result = BracketValidationService.validateTeamSelection('not-array');

    expect(result).toEqual({
      isValid: false,
      invalidTeams: [],
      errors: ['Team selection must be an array'],
    });
  });

  it('flags empty/null/non-string entries', () => {
    const result = BracketValidationService.validateTeamSelection([
      '',
      null,
      123,
    ] as unknown as string[]);

    expect(result.isValid).toBe(false);
    expect(result.invalidTeams).toEqual([
      'Team at position 1',
      'Team at position 2',
      'Team at position 3',
    ]);
    expect(result.errors).toContain('Empty or invalid team ID at position 1');
    expect(result.errors).toContain('Empty or invalid team ID at position 2');
    expect(result.errors).toContain('Empty or invalid team ID at position 3');
  });

  it('flags string sentinels "undefined" and "null"', () => {
    const result = BracketValidationService.validateTeamSelection(['undefined', 'null']);

    expect(result.isValid).toBe(false);
    expect(result.invalidTeams).toEqual(['Team at position 1', 'Team at position 2']);
    expect(result.errors).toContain('Invalid team ID value at position 1');
    expect(result.errors).toContain('Invalid team ID value at position 2');
  });

  it('flags invalid UUID formats', () => {
    const result = BracketValidationService.validateTeamSelection(['not-a-uuid']);

    expect(result.isValid).toBe(false);
    expect(result.invalidTeams).toEqual(['Team at position 1']);
    expect(result.errors).toContain('Invalid team ID format at position 1: not-a-uuid');
  });

  it('returns valid when all team IDs are valid UUIDs', () => {
    const result = BracketValidationService.validateTeamSelection([VALID_UUID_1, VALID_UUID_2]);

    expect(result).toEqual({ isValid: true, invalidTeams: [], errors: [] });
  });
});

describe('BracketValidationService.sanitizeFormData', () => {
  it('trims title and divisionId', () => {
    const result = BracketValidationService.sanitizeFormData({
      ...validPayload,
      title: '  Trimmed Title  ',
      divisionId: `  ${VALID_UUID_1}  `,
    });

    expect(result.title).toBe('Trimmed Title');
    expect(result.divisionId).toBe(VALID_UUID_1);
  });

  it('filters invalid and blank team IDs', () => {
    const result = BracketValidationService.sanitizeFormData({
      ...validPayload,
      teams: [VALID_UUID_2, '  ', 'not-a-uuid', null, VALID_UUID_3] as unknown as string[],
    });

    expect(result.teams).toEqual([VALID_UUID_2, VALID_UUID_3]);
  });

  it('throws ValidationError for invalid structure', () => {
    expect(() => BracketValidationService.sanitizeFormData({ title: 'missing-fields' })).toThrow(
      ValidationError
    );
    expect(() => BracketValidationService.sanitizeFormData({ title: 'missing-fields' })).toThrow(
      'Invalid form data structure for sanitization'
    );
  });
});

describe('BracketValidationService.validateForSubmission', () => {
  it('throws when sanitization fails', () => {
    expect(() => BracketValidationService.validateForSubmission(null)).toThrow(ValidationError);
  });

  it('returns form validation errors when form validation fails', () => {
    const result = BracketValidationService.validateForSubmission({
      ...validPayload,
      title: '   ',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Title is required and cannot be empty');
  });

  it('returns team validation errors when team validation fails', () => {
    const teamSpy = vi.spyOn(BracketValidationService, 'validateTeamSelection').mockReturnValue({
      isValid: false,
      invalidTeams: ['Team at position 1'],
      errors: ['Invalid team ID format at position 1: forced-by-test'],
    });

    const result = BracketValidationService.validateForSubmission(validPayload);

    expect(result).toEqual({
      isValid: false,
      errors: ['Invalid team ID format at position 1: forced-by-test'],
    });

    teamSpy.mockRestore();
  });

  it('returns success for valid payload', () => {
    const result = BracketValidationService.validateForSubmission(validPayload);

    expect(result).toEqual({ isValid: true, errors: [] });
  });
});
