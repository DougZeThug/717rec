
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

  // Enhanced bracket creation handler that navigates to newly created bracket
  const handleBracketCreatedWithNavigation = useCallback(async () => {
    console.log('🎯 usePlayoffHandlers: Starting bracket creation with navigation');
    
    try {
      // Get current bracket count before creation
      const currentBracketCount = data.allBracketsData.length;
      console.log('🎯 usePlayoffHandlers: Current bracket count before creation:', currentBracketCount);
      
      // Call the original bracket creation handler
      await data.handleBracketCreated();
      
      // After successful creation, refetch to get updated data
      console.log('🎯 usePlayoffHandlers: Refetching brackets after creation');
      await data.refetchBrackets();
      
      // Small delay to ensure data is fully updated
      setTimeout(async () => {
        try {
          // Refetch one more time to ensure we have the latest data
          await data.refetchBrackets();
          
          // Find the newly created bracket (should be the most recent one)
          if (data.allBracketsData.length > currentBracketCount) {
            // Get the most recently created bracket (assuming they're ordered by creation time)
            const allBrackets = data.allBracketsData;
            const newestBracket = allBrackets[allBrackets.length - 1];
            
            if (newestBracket?.id) {
              console.log('🎯 usePlayoffHandlers: Navigating to newly created bracket:', newestBracket.id);
              data.setSelectedBracketId(newestBracket.id);
            } else {
              console.log('🎯 usePlayoffHandlers: Newest bracket found but no ID');
            }
          } else {
            console.log('🎯 usePlayoffHandlers: No new bracket detected, bracket count unchanged');
          }
        } catch (error) {
          console.error('🎯 usePlayoffHandlers: Error in delayed bracket navigation:', error);
        }
      }, 1000);
      
    } catch (error) {
      console.error('🎯 usePlayoffHandlers: Error in bracket creation with navigation:', error);
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
