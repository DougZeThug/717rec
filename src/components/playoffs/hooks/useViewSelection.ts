
import { PlayoffPageData } from './usePlayoffPageData';

export type ViewType = 'admin' | 'public' | 'loading' | 'none';

export function useViewSelection(data: PlayoffPageData): ViewType {
  if (data.isLoading) return 'loading';
  if (!data.bracket) return 'none';
  return data.isAdmin ? 'admin' : 'public';
}
