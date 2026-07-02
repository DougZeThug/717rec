import { usePlayoffEditMatch } from '@/hooks/playoffs/usePlayoffEditMatch';

import { PlayoffPageData } from './usePlayoffPageData';

export function usePlayoffHandlers(data: PlayoffPageData) {
  const {
    editingMatch,
    isQuickEdit,
    handleEditMatch,
    handleCloseMatchEditor,
    handleSaveMatchScore,
  } = usePlayoffEditMatch();

  return {
    editingMatch,
    isQuickEdit,
    handleEditMatch,
    handleCloseMatchEditor,
    handleSaveMatchScore,
  };
}
