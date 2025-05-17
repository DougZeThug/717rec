
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
    team2GameWins: number
  ) => Promise<void>;
  onCancel: () => void;
  challongeTournamentId?: string | null;
  challongeMatchId?: string | null;
}

// This is a simple wrapper component that maintains backward compatibility
// while forwarding to our refactored implementation
const MatchScoreEditorWrapper: React.FC<MatchScoreEditorWrapperProps> = ({
  match,
  teams,
  onSave,
  onCancel,
  // We're removing Challonge integration as per the requirements
  // challongeTournamentId,
  // challongeMatchId
}) => {
  return (
    <MatchScoreEditor
      match={match}
      teams={teams}
      onSave={onSave}
      onCancel={onCancel}
    />
  );
};

export default MatchScoreEditorWrapper;
