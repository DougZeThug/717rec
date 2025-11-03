
import React from "react";
import PlayoffPageContent from "@/components/playoffs/PlayoffPageContent";
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
    <PlayoffPageContent
      availableDivisions={data.availableDivisions}
      bracketsByDivision={data.typesafeBracketsByDivision}
      allBracketsData={data.allBracketsData}
      isLoading={data.isLoading}
      onCreateBracket={handleCreateBracketClick}
      onDeleteBracket={data.isAdmin ? onDeleteBracket : undefined}
      onRefreshData={data.refetchBrackets}
      isAdmin={data.isAdmin}
    />
  );
};

export default PlayoffView;
