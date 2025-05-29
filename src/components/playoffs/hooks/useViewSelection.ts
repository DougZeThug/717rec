
import { PlayoffPageData } from './usePlayoffPageData';

export type ViewType = 'admin' | 'public' | 'loading' | 'none';

export function useViewSelection(data: PlayoffPageData): ViewType {
  if (data.isLoading) return 'loading';
  
  // If we have brackets available (even if none specifically selected), show the appropriate view
  if (data.allBracketsData && data.allBracketsData.length > 0) {
    return data.isAdmin ? 'admin' : 'public';
  }
  
  // Only show 'none' if we have no brackets at all
  return 'none';
}
