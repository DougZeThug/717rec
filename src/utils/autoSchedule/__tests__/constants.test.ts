
import { describe, it, expect } from 'vitest';
import { TIME_BLOCKS } from '../constants';

describe('TIME_BLOCKS constants', () => {
  it('should have the expected time block structure', () => {
    expect(TIME_BLOCKS).toHaveProperty('SuperUltraEarly');
    expect(TIME_BLOCKS).toHaveProperty('UltraEarly');
    expect(TIME_BLOCKS).toHaveProperty('SuperEarly');
    expect(TIME_BLOCKS).toHaveProperty('Early');
  });

  it('should have main and secondary timeslots for each block', () => {
    Object.values(TIME_BLOCKS).forEach(block => {
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
