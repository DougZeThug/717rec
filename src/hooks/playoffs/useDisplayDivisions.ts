import { useMemo } from 'react';
import { Division } from '@/types';

export interface DisplayDivision {
  name: string;
  displayName: string;
  internalDivisions: Division[];
}

/**
 * Groups internal divisions by their display_division field
 * Returns the 3 main display divisions: Competitive, Intermediate, Recreational
 */
export const useDisplayDivisions = (divisions: Division[]): DisplayDivision[] => {
  return useMemo(() => {
    if (!Array.isArray(divisions)) return [];

    // Group divisions by display_division
    const groupedDivisions = divisions.reduce((acc, division) => {
      const displayDivision = division.display_division || division.name || 'Unknown';
      
      if (!acc[displayDivision]) {
        acc[displayDivision] = [];
      }
      acc[displayDivision].push(division);
      return acc;
    }, {} as Record<string, Division[]>);

    // Convert to array and sort by common display division order
    const displayOrder = ['Competitive', 'Intermediate', 'Recreational'];
    
    return Object.entries(groupedDivisions)
      .map(([displayName, internalDivisions]) => ({
        name: displayName.toLowerCase().replace(/\s+/g, '_'),
        displayName,
        internalDivisions
      }))
      .sort((a, b) => {
        const aIndex = displayOrder.indexOf(a.displayName);
        const bIndex = displayOrder.indexOf(b.displayName);
        
        // If both are in the order array, sort by index
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        
        // If only one is in the order array, prioritize it
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        
        // If neither is in the order array, sort alphabetically
        return a.displayName.localeCompare(b.displayName);
      });
  }, [divisions]);
};