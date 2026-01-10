import { useCallback } from 'react';

import { usePlayoffEditMatch } from '@/hooks/playoffs/usePlayoffEditMatch';
import { errorLog, playoffLog } from '@/utils/logger';

import { PlayoffPageData } from './usePlayoffPageData';

export function usePlayoffHandlers(data: PlayoffPageData) {
  const {
    editingMatch,
    isQuickEdit,
    handleEditMatch,
    handleCloseMatchEditor,
    handleSaveMatchScore,
  } = usePlayoffEditMatch();

  const handleBracketCreatedWithNavigation = useCallback(async () => {
    playoffLog('Starting simplified bracket creation');

    try {
      await data.handleBracketCreated();
      playoffLog('Bracket creation completed successfully');
    } catch (error) {
      errorLog('Error in bracket creation:', error);
      throw error;
    }
  }, [data]);

  return {
    editingMatch,
    isQuickEdit,
    handleEditMatch,
    handleCloseMatchEditor,
    handleSaveMatchScore,
    handleBracketCreatedWithNavigation,
  };
}
