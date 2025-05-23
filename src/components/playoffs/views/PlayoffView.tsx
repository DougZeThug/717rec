
import React from "react";
import PlayoffPageContent from "@/components/playoffs/PlayoffPageContent";
import { PlayoffBracket, Team } from "@/types";

interface PlayoffViewProps {
  availableDivisions: string[];
  bracketsByDivision: Record<string, PlayoffBracket[]>;
  selectedBracketId: string | null;
  bracket: PlayoffBracket | null;
  teams: Team[];
  bracketLoading: boolean;
  allBracketsData: PlayoffBracket[];
  isLoading: boolean;
  onCreateBracket: () => void;
  onViewBracket: (id: string) => void;
  onEditBracket: () => void;
  onEditMatch: (matchId: string) => void;
  onDeleteBracket?: (id: string, name: string) => void;
}

const PlayoffView: React.FC<PlayoffViewProps> = ({
  availableDivisions,
  bracketsByDivision,
  selectedBracketId,
  bracket,
  teams,
  bracketLoading,
  allBracketsData,
  isLoading,
  onCreateBracket,
  onViewBracket,
  onEditBracket,
  onEditMatch,
  onDeleteBracket
}) => {
  return (
    <PlayoffPageContent
      availableDivisions={availableDivisions}
      bracketsByDivision={bracketsByDivision}
      selectedBracketId={selectedBracketId}
      bracket={bracket}
      teams={teams}
      bracketLoading={bracketLoading}
      allBracketsData={allBracketsData}
      isLoading={isLoading}
      onCreateBracket={onCreateBracket}
      onViewBracket={onViewBracket}
      onEditBracket={onEditBracket}
      onEditMatch={onEditMatch}
      onDeleteBracket={onDeleteBracket}
    />
  );
};

export default PlayoffView;
