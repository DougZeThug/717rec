import { usePersistedState } from './usePersistedState';

export type DisplayMode = 'all' | 'grouped';
export type ViewMode = 'grid' | 'list';
export type SortMode = 'rank' | 'alpha';

interface UseTeamsPreferencesOptions {
  defaultDisplayMode?: DisplayMode;
  defaultViewMode?: ViewMode;
  defaultSortMode?: SortMode;
}

/**
 * Custom hook for managing team page display preferences with localStorage persistence
 * Consolidates three separate localStorage state management patterns into one hook
 */
export const useTeamsPreferences = (options?: UseTeamsPreferencesOptions) => {
  const {
    defaultDisplayMode = 'all',
    defaultViewMode = 'grid',
    defaultSortMode = 'rank',
  } = options || {};

  const [displayMode, setDisplayMode] = usePersistedState<DisplayMode>(
    'teamsDisplayMode',
    defaultDisplayMode
  );

  const [viewMode, setViewMode] = usePersistedState<ViewMode>(
    'teamsViewMode',
    defaultViewMode
  );

  const [sortMode, setSortMode] = usePersistedState<SortMode>(
    'teamsSortMode',
    defaultSortMode
  );

  return {
    displayMode,
    setDisplayMode,
    viewMode,
    setViewMode,
    sortMode,
    setSortMode,
  };
};
