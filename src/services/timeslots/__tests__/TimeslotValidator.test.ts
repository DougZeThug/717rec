import { describe, expect, it } from 'vitest';

import { TimeslotValidator } from '../TimeslotValidator';

// ─── validateTimeslotAssignment ───────────────────────────────────────────────

describe('validateTimeslotAssignment', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  it('returns invalid when date is null', () => {
    const result = TimeslotValidator.validateTimeslotAssignment(null, 'team-1', '6:30 PM');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Date is required');
  });

  it('returns invalid when teamId is null', () => {
    const result = TimeslotValidator.validateTimeslotAssignment(tomorrow, null, '6:30 PM');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Team is required');
  });

  it('returns invalid when timeslot is null', () => {
    const result = TimeslotValidator.validateTimeslotAssignment(tomorrow, 'team-1', null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Timeslot is required');
  });

  it('returns invalid for a past date', () => {
    const past = new Date('2020-01-01');
    const result = TimeslotValidator.validateTimeslotAssignment(past, 'team-1', '6:30 PM');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Cannot assign timeslots to past dates');
  });

  it('returns valid for a future date with all fields provided', () => {
    const result = TimeslotValidator.validateTimeslotAssignment(tomorrow, 'team-1', '6:30 PM');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

// ─── validateBatchAssignment ──────────────────────────────────────────────────

describe('validateBatchAssignment', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  it('returns invalid when date is null', () => {
    const result = TimeslotValidator.validateBatchAssignment(null, ['t-1'], '6:30 PM');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Date is required');
  });

  it('returns invalid when teamIds is empty', () => {
    const result = TimeslotValidator.validateBatchAssignment(tomorrow, [], '6:30 PM');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('At least one team must be selected');
  });

  it('returns invalid when timeslot is null', () => {
    const result = TimeslotValidator.validateBatchAssignment(tomorrow, ['t-1'], null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Timeslot is required');
  });

  it('returns valid when all fields are provided', () => {
    const result = TimeslotValidator.validateBatchAssignment(tomorrow, ['t-1', 't-2'], '6:30 PM');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
