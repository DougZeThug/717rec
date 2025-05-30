
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDivisionMapping } from '../useDivisionMapping';
import { Division } from '@/types';

describe('useDivisionMapping', () => {
  const mockDivisions: Division[] = [
    { id: 'div-1', name: 'Division A' },
    { id: 'div-2', name: 'Division B' },
    { id: 'div-3', name: 'Division C' }
  ];

  it('should create division map when data is ready', () => {
    const { result } = renderHook(() => 
      useDivisionMapping(mockDivisions, true)
    );

    expect(result.current.divisionMap.size).toBe(3);
    expect(result.current.divisionMap.get('Division A')).toBe('div-1');
    expect(result.current.divisionMap.get('Division B')).toBe('div-2');
    expect(result.current.divisionMap.get('Division C')).toBe('div-3');
  });

  it('should return empty map when data is not ready', () => {
    const { result } = renderHook(() => 
      useDivisionMapping(mockDivisions, false)
    );

    expect(result.current.divisionMap.size).toBe(0);
  });

  it('should return empty map when divisions array is empty', () => {
    const { result } = renderHook(() => 
      useDivisionMapping([], true)
    );

    expect(result.current.divisionMap.size).toBe(0);
  });

  it('should map division name to ID correctly', () => {
    const { result } = renderHook(() => 
      useDivisionMapping(mockDivisions, true)
    );

    expect(result.current.mapDivisionName('Division A')).toBe('div-1');
    expect(result.current.mapDivisionName('Division B')).toBe('div-2');
    expect(result.current.mapDivisionName('NonExistent')).toBeNull();
  });

  it('should handle duplicate division names', () => {
    const duplicateDivisions: Division[] = [
      { id: 'div-1', name: 'Division A' },
      { id: 'div-2', name: 'Division A' }
    ];

    const { result } = renderHook(() => 
      useDivisionMapping(duplicateDivisions, true)
    );

    // Should use the last occurrence
    expect(result.current.mapDivisionName('Division A')).toBe('div-2');
  });

  it('should memoize division map correctly', () => {
    const { result, rerender } = renderHook(
      ({ divisions, isReady }) => useDivisionMapping(divisions, isReady),
      { initialProps: { divisions: mockDivisions, isReady: true } }
    );

    const firstMap = result.current.divisionMap;
    
    // Rerender with same props
    rerender({ divisions: mockDivisions, isReady: true });
    
    expect(result.current.divisionMap).toBe(firstMap);
  });
});
