
import React from "react";
import BracketList from "@/components/playoffs/BracketList";
import { ChallongeFallback } from "@/components/playoffs/embeds/ChallongeFallback";
import { PlayoffPageData } from "../hooks/usePlayoffPageData";

interface PlayoffViewProps {
  bracketDialogOpen: boolean;
  setBracketDialogOpen: (open: boolean) => void;
  onCreateBracket: () => void;
  onDeleteBracket: (bracketId: string, bracketName: string) => void;
  data: PlayoffPageData;
}

const PlayoffView: React.FC<PlayoffViewProps> = ({ 
  bracketDialogOpen,
  setBracketDialogOpen,
  onCreateBracket,
  onDeleteBracket,
  data
}) => {
  const handleCreateBracketClick = () => {
    console.log('🎯 PlayoffView: Create bracket button clicked');
    onCreateBracket();
  };

  return (
    <>
      {/* Challonge Fallback - Always show for everyone */}
      <div className="mb-8">
        <ChallongeFallback />
      </div>

      {/* Use BracketList for everyone, same as AdminView */}
      <BracketList 
        divisions={data.availableDivisions}
        bracketsByDivision={data.typesafeBracketsByDivision}
        onCreateBracket={data.isAdmin ? handleCreateBracketClick : undefined}
        onViewBracket={(id) => data.setSelectedBracketId(id)}
        onEditBracket={data.isAdmin ? handleCreateBracketClick : undefined}
        onDeleteBracket={data.isAdmin ? onDeleteBracket : undefined}
        onResyncBracket={undefined}
        isResyncLoading={false}
        isLoading={data.isLoading}
      />
    </>
  );
};

export default PlayoffView;
