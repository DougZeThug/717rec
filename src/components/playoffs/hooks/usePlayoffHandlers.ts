import { usePlayoffEditMatch } from "@/hooks/playoffs/usePlayoffEditMatch";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateMatchRelatedQueries } from "@/hooks/matches/utils/queryCacheUtils";
import { PlayoffGame } from "@/utils/playoffs/playoffTypes";
import { PlayoffPageData } from "./usePlayoffPageData";

export interface PlayoffHandlers {
  // Match editing
  editingMatch: any;
  isQuickEdit: boolean;
  handleEditMatch: (matchId: string, quickEdit?: boolean) => (bracket: any) => void;
  handleCloseMatchEditor: () => void;
  handleSaveMatchScore: (
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number }[],
    team1GameWins: number,
    team2GameWins: number,
    refetchBrackets?: () => Promise<any>
  ) => Promise<void>;
  
  // Bracket operations
  handleCreateBracket: () => void;
  handleDeleteBracket: (bracketId: string, bracketName: string) => void;
  handleConfirmDeleteBracket: () => Promise<void>;
  handleEditMatchClick: (matchId: string, quickEdit?: boolean) => void;
  handleSaveScore: (
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number }[],
    team1GameWins: number,
    team2GameWins: number
  ) => Promise<void>;
}

export function usePlayoffHandlers(data: PlayoffPageData): PlayoffHandlers {
  const { editingMatch, isQuickEdit, handleEditMatch, handleCloseMatchEditor, handleSaveMatchScore } = usePlayoffEditMatch();
  const queryClient = useQueryClient();

  const handleCreateBracket = () => {
    // This will be handled by the view state hook
  };
  
  const handleEditMatchClick = (matchId: string, quickEdit: boolean = false) => {
    handleEditMatch(matchId, quickEdit)(data.bracket);
  };

  const handleDeleteBracket = (bracketId: string, bracketName: string) => {
    // This will be handled by the view state hook
  };
  
  const handleConfirmDeleteBracket = async () => {
    // This will be handled by the view state hook
  };
  
  const handleSaveScore = async (
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number }[],
    team1GameWins: number,
    team2GameWins: number
  ) => {
    await handleSaveMatchScore(
      matchId, 
      team1Score, 
      team2Score, 
      games, 
      team1GameWins, 
      team2GameWins,
      data.refetchBrackets
    );
  };

  return {
    // Match editing
    editingMatch,
    isQuickEdit,
    handleEditMatch,
    handleCloseMatchEditor,
    handleSaveMatchScore,
    
    // Bracket operations
    handleCreateBracket,
    handleDeleteBracket,
    handleConfirmDeleteBracket,
    handleEditMatchClick,
    handleSaveScore
  };
}
