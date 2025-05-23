
import React from "react";
import PlayoffPageContent from "@/components/playoffs/PlayoffPageContent";
import { PlayoffBracket, Team } from "@/types";
import SampleBracketViewer from "../bracket-viewer/SampleBracketViewer";
import { Button } from "@/components/ui/button";

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
  // Toggle for showing the sample bracket viewer (temporary for testing)
  const [showSample, setShowSample] = React.useState(false);

  return (
    <div className="space-y-6">
      {/* Testing controls - will be removed later */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          onClick={() => setShowSample(!showSample)}
        >
          {showSample ? "Hide Sample Bracket" : "Show Sample Bracket"}
        </Button>
      </div>

      {/* Sample bracket viewer for testing */}
      {showSample && (
        <div className="mb-8">
          <SampleBracketViewer />
        </div>
      )}
      
      {/* Regular playoff content */}
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
    </div>
  );
};

export default PlayoffView;
