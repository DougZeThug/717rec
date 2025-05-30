
import React from 'react';
import { Division } from '@/types';
import { DivisionMappingResult } from '../types';

/**
 * Hook for creating a mapping between division names and their UUIDs
 * @param divisions - Array of division objects with id and name properties
 * @param isDataReady - Boolean indicating if the data is ready for processing
 * @returns Object containing the division map and mapping function
 */
export const useDivisionMapping = (
  divisions: Division[],
  isDataReady: boolean
): DivisionMappingResult => {
  const divisionMap = React.useMemo(() => {
    if (!isDataReady || !divisions.length) {
      return new Map<string, string>();
    }
    
    const map = new Map<string, string>();
    divisions.forEach(division => {
      map.set(division.name, division.id);
    });
    return map;
  }, [divisions, isDataReady]);

  /**
   * Maps a division name to its corresponding UUID
   * @param name - The division name to map
   * @returns The division UUID or null if not found
   */
  const mapDivisionName = React.useCallback((name: string): string | null => {
    return divisionMap.get(name) || null;
  }, [divisionMap]);

  return {
    divisionMap,
    mapDivisionName
  };
};
