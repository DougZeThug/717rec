
import { BaseFilter } from '../interfaces/StorageAdapter';
import { StageFilter } from '../types/AdapterTypes';

/**
 * Utility functions for working with filters
 */
export const filterUtils = {
  /**
   * Convert a generic filter to a StageFilter
   * Ensures id is a string, not an array
   */
  toStageFilter(filter?: any): StageFilter {
    if (!filter) return {};
    
    // Create a new filter object with the same properties
    const stageFilter: StageFilter = { ...filter };
    
    // Handle the id property specifically
    if (filter.id) {
      // If id is an array, take the first element
      stageFilter.id = Array.isArray(filter.id) ? filter.id[0] : filter.id;
    }
    
    return stageFilter;
  },
  
  /**
   * Check if a filter is invalid (contains undefined IDs)
   */
  isInvalidFilter(filter?: BaseFilter): boolean {
    if (!filter) return false;
    
    // Check for invalid IDs
    if (filter.id) {
      if (Array.isArray(filter.id)) {
        return filter.id.some(id => id === 'undefined');
      }
      return filter.id === 'undefined';
    }
    
    return false;
  }
};
