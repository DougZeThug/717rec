
import { useCallback } from 'react';
import { usePlayoffEditMatch } from '@/hooks/playoffs/usePlayoffEditMatch';
import { PlayoffPageData } from './usePlayoffPageData';

export function usePlayoffHandlers(data: PlayoffPageData) {
  const {
    editingMatch,
    isQuickEdit,
    handleEditMatch,
    handleCloseMatchEditor,
    handleSaveMatchScore
  } = usePlayoffEditMatch();

  // Simplified bracket creation handler - no complex loops or navigation
  const handleBracketCreatedWithNavigation = useCallback(async () => {
    console.log('🎯 usePlayoffHandlers: Starting simplified bracket creation');
    
    try {
      // Call the original bracket creation handler
      await data.handleBracketCreated();
      console.log('🎯 usePlayoffHandlers: Bracket creation completed successfully');
      
    } catch (error) {
      console.error('🎯 usePlayoffHandlers: Error in bracket creation:', error);
      throw error;
    }
  }, [data]);

  return {
    editingMatch,
    isQuickEdit,
    handleEditMatch,
    handleCloseMatchEditor,
    handleSaveMatchScore,
    handleBracketCreatedWithNavigation
  };
}
