import { describe, expect, it } from 'vitest';

import { BACK_TO_BACK_PAIRS, getPairConfig, TIME_BLOCKS } from '../constants';

describe('TIME_BLOCKS constants', () => {
  it('should have the expected time block structure', () => {
    expect(TIME_BLOCKS).toHaveProperty('SuperUltraEarly');
    expect(TIME_BLOCKS).toHaveProperty('UltraEarly');
    expect(TIME_BLOCKS).toHaveProperty('SuperEarly');
    expect(TIME_BLOCKS).toHaveProperty('Early');
  });

  it('should have main and secondary timeslots for each block', () => {
    Object.values(TIME_BLOCKS).forEach((block) => {
      expect(block).toHaveProperty('main');
      expect(block).toHaveProperty('secondary');
    });
  });

  it('should have correct time pairings', () => {
    expect(TIME_BLOCKS['SuperUltraEarly'].main).toBe('5:00 PM');
    expect(TIME_BLOCKS['SuperUltraEarly'].secondary).toBe('5:30 PM');

    expect(TIME_BLOCKS['UltraEarly'].main).toBe('5:30 PM');
    expect(TIME_BLOCKS['UltraEarly'].secondary).toBe('6:00 PM');

    expect(TIME_BLOCKS['SuperEarly'].main).toBe('6:00 PM');
    expect(TIME_BLOCKS['SuperEarly'].secondary).toBe('6:30 PM');

    expect(TIME_BLOCKS['Early'].main).toBe('6:30 PM');
    expect(TIME_BLOCKS['Early'].secondary).toBe('7:00 PM');
  });
});

describe('BACK_TO_BACK_PAIRS as the source of block times', () => {
  it('yields every real block time in order when de-duplicated, and no others', () => {
    // EditableMatchCard builds its timeslot picker from exactly this expression.
    const options = [
      ...new Set(
        Object.values(BACK_TO_BACK_PAIRS).flatMap((pair) => [pair.primary, pair.secondary])
      ),
    ];

    expect(options).toEqual([
      '5:00 PM',
      '5:30 PM',
      '6:00 PM',
      '6:30 PM',
      '7:00 PM',
      '7:30 PM',
      '8:00 PM',
      '8:30 PM',
      '9:00 PM',
      '9:30 PM',
    ]);
  });

  it('resolves a block name to its start time and leaves a clock time unresolved', () => {
    // This is what keeps a block name out of a saved match.
    expect(getPairConfig('SuperLate')?.primary).toBe('9:00 PM');
    expect(getPairConfig('MidEarly')?.primary).toBe('7:00 PM');
    expect(getPairConfig('6:30 PM')).toBeUndefined();
  });
});
