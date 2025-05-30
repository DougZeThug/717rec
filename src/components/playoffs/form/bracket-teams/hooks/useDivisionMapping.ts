
import React from 'react';
import { Division } from '@/types';
import { DivisionMappingResult } from '../types';

export const useDivisionMapping = (
  divisions: Division[],
  isDataReady: boolean
): DivisionMappingResult => {
  const divisionMap = React.useMemo(() => {
    if (!isDataReady || !divisions.length) {
      console.log("useDivisionMapping: Skipping division map creation - data not ready");
      return new Map<string, string>();
    }
    
    const map = new Map<string, string>();
    divisions.forEach(division => {
      map.set(division.name, division.id);
    });
    console.log("useDivisionMapping: Division lookup map:", Object.fromEntries(map));
    return map;
  }, [divisions, isDataReady]);

  const mapDivisionName = React.useCallback((name: string): string | null => {
    return divisionMap.get(name) || null;
  }, [divisionMap]);

  return {
    divisionMap,
    mapDivisionName
  };
};
