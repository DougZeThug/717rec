
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

  // Enhanced bracket creation handler with aggressive cache invalidation
  const handleBracketCreatedWithNavigation = useCallback(async () => {
    console.log('🎯 usePlayoffHandlers: Starting bracket creation with enhanced navigation');
    
    try {
      // Get current bracket count before creation
      const currentBracketCount = data.allBracketsData.length;
      console.log('🎯 usePlayoffHandlers: Current bracket count before creation:', currentBracketCount);
      
      // Call the original bracket creation handler
      await data.handleBracketCreated();
      
      // Wait longer for backend processing to complete
      console.log('🎯 usePlayoffHandlers: Waiting for backend processing...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Force multiple refetches to ensure we get the latest data
      console.log('🎯 usePlayoffHandlers: Performing aggressive data refresh...');
      for (let i = 0; i < 3; i++) {
        await data.refetchBrackets();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Find and navigate to the newly created bracket
      console.log('🎯 usePlayoffHandlers: Looking for newly created bracket...');
      
      // Wait a bit more and try to find the new bracket
      setTimeout(async () => {
        try {
          // Final refetch attempt
          await data.refetchBrackets();
          
          // Look for the newest bracket
          if (data.allBracketsData.length > currentBracketCount) {
            const allBrackets = data.allBracketsData;
            const newestBracket = allBrackets[allBrackets.length - 1];
            
            if (newestBracket?.id) {
              console.log('🎯 usePlayoffHandlers: Navigating to newly created bracket:', newestBracket.id);
              data.setSelectedBracketId(newestBracket.id);
              
              // Force an additional refetch of the matches for the new bracket
              setTimeout(() => {
                console.log('🎯 usePlayoffHandlers: Triggering final data refresh for new bracket');
                data.refetchBrackets();
              }, 1000);
            }
          }
        } catch (error) {
          console.error('🎯 usePlayoffHandlers: Error in delayed bracket navigation:', error);
        }
      }, 1500);
      
    } catch (error) {
      console.error('🎯 usePlayoffHandlers: Error in enhanced bracket creation:', error);
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
