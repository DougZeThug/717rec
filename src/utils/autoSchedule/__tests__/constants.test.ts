
import { describe, it, expect } from 'vitest';
import { TIME_BLOCKS } from '../constants';

describe('TIME_BLOCKS constants', () => {
  it('should have the expected time block structure', () => {
    expect(TIME_BLOCKS).toHaveProperty('6:30');
    expect(TIME_BLOCKS).toHaveProperty('7:30');
    expect(TIME_BLOCKS).toHaveProperty('8:30');
  });

  it('should have main and secondary timeslots for each block', () => {
    Object.values(TIME_BLOCKS).forEach(block => {
      expect(block).toHaveProperty('main');
      expect(block).toHaveProperty('secondary');
    });
  });

  it('should have correct time pairings', () => {
    expect(TIME_BLOCKS['6:30'].main).toBe('6:30 PM');
    expect(TIME_BLOCKS['6:30'].secondary).toBe('7:00 PM');
    
    expect(TIME_BLOCKS['7:30'].main).toBe('7:30 PM');
    expect(TIME_BLOCKS['7:30'].secondary).toBe('8:00 PM');
    
    expect(TIME_BLOCKS['8:30'].main).toBe('8:30 PM');
    expect(TIME_BLOCKS['8:30'].secondary).toBe('9:00 PM');
  });
});
