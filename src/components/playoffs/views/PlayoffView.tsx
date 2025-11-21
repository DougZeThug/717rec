
import React from "react";
import BracketList from "@/components/playoffs/BracketList";
import BracketDetail from "@/components/playoffs/BracketDetail";
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
      {/* Challonge embeds temporarily hidden */}
      {/* <div className="mb-8">
        <ChallongeFallback />
      </div> */}

      {/* Show BracketList only when no bracket is selected */}
      <div className={!data.selectedBracketId || !data.bracket ? 'block' : 'hidden'}>
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
      </div>

      {/* Show BracketDetail when a bracket is selected */}
      {data.ready && data.selectedBracketId && data.bracket && data.bracket.id === data.selectedBracketId && (
        <BracketDetail 
          bracketId={data.selectedBracketId}
          bracket={data.bracket}
          teams={data.teams}
          bracketLoading={data.isLoading}
          onEditBracket={undefined}
          onEditMatch={undefined}
          onDeleteBracket={undefined}
        />
      )}
    </>
  );
};

export default PlayoffView;
