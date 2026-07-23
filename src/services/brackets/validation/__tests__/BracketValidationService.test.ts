import { describe, expect, it } from 'vitest';

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
