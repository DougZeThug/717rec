
import React from "react";
import type { PlayoffMatch, Team } from "@/types";
import MatchScoreEditor from "./MatchScoreEditor/MatchScoreEditor";

interface MatchScoreEditorWrapperProps {
  match: PlayoffMatch;
  teams: Team[];
  onSave: (
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number; }[],
    team1GameWins: number,
    team2GameWins: number,
    refetchBrackets: () => Promise<any>
  ) => Promise<void>;
  onCancel: () => void;
}

// This is a simple wrapper component that maintains backward compatibility
// while forwarding to our refactored implementation
const MatchScoreEditorWrapper: React.FC<MatchScoreEditorWrapperProps> = ({
  match,
  teams,
  onSave,
  onCancel
}) => {
  // We're adapting the new parameters to match the old expected structure
  const handleSave = async (
    matchId: string,
    games: { team1Score: number; team2Score: number }[],
    team1GameWins: number,
    team2GameWins: number,
    winnerId: string
  ) => {
    // Set match score to 1-0 (winner-loser format)
    const team1Score = match.team1Id === winnerId ? 1 : 0;
    const team2Score = match.team2Id === winnerId ? 1 : 0;
    
    // Create a dummy refetchBrackets function since the actual refetch is handled at a higher level
    const dummyRefetch = async () => {};
    
    await onSave(
      matchId,
      team1Score,
      team2Score,
      games,
      team1GameWins,
      team2GameWins,
      dummyRefetch
    );
  };

  return (
    <MatchScoreEditor
      match={match}
      teams={teams}
      onSave={handleSave}
      onCancel={onCancel}
    />
  );
};

export default MatchScoreEditorWrapper;
