import { PlayoffPageData } from './usePlayoffPageData';

export type ViewType = 'admin' | 'public' | 'loading';

export function useViewSelection(data: PlayoffPageData): ViewType {
  if (data.isLoading) return 'loading';

  // Always show either admin or public view - the Challonge fallback should be visible
  // regardless of whether there are native brackets in the database
  return data.isAdmin ? 'admin' : 'public';
}
