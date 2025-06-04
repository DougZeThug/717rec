
import { useCallback } from "react";
import { PlayoffMatch } from "@/types";
import { ScoreOption } from "../types";
import { generateGameData } from "../utils/scoreOptionUtils";

interface UseScoreSubmissionProps {
  match: PlayoffMatch;
  onSave: (
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number }[],
    team1GameWins: number,
    team2GameWins: number,
    refetchBrackets: () => Promise<any>
  ) => Promise<void>;
  setIsSubmitting: (value: boolean) => void;
  setSelectedOption: (value: string | null) => void;
}

export const useScoreSubmission = ({
  match,
  onSave,
  setIsSubmitting,
  setSelectedOption
}: UseScoreSubmissionProps) => {
  
  const handleQuickScore = useCallback(async (option: ScoreOption) => {
    if (!match.team1Id || !match.team2Id) return;
    
    setSelectedOption(option.label);
    setIsSubmitting(true);
    
    try {
      // Generate mock game data based on the score pattern
      const games = generateGameData(option);

      // Create a dummy refetchBrackets function since the actual refetch is handled at a higher level
      const dummyRefetch = async () => {};

      // Save the match score
      await onSave(
        match.id,
        option.team1GameWins > option.team2GameWins ? 1 : 0, // Binary match score
        option.team2GameWins > option.team1GameWins ? 1 : 0, // Binary match score
        games,
        option.team1GameWins,
        option.team2GameWins,
        dummyRefetch
      );

      // Reset UI state after saving
      setIsSubmitting(false);
      setSelectedOption(null);
    } catch (error) {
      console.error("Error saving quick score:", error);
      setIsSubmitting(false);
    }
  }, [match, onSave, setIsSubmitting, setSelectedOption]);
  
  return { handleQuickScore };
};
