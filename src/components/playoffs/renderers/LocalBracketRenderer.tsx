
import React from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { BracketsViewerComponent } from "@/components/playoffs/viewer";
import { PlayoffBracket, PlayoffTeam } from "@/utils/playoffs/playoffTypes";

interface LocalBracketRendererProps {
  bracket: PlayoffBracket;
  teams: PlayoffTeam[];
  onEditMatch?: (matchId: string) => void;
  [key: string]: any;
}

export const LocalBracketRenderer: React.FC<LocalBracketRendererProps> = ({
  bracket,
  teams,
  onEditMatch,
  ...props
}) => {
  const { isAdminAccessGranted, isLoading: isAdminLoading } = useAdminAccess();
  
  console.log('🔐 LocalBracketRenderer admin check:', { isAdminAccessGranted, isAdminLoading });
  
  if (!bracket) {
    return (
      <div className="text-center p-8">
        <p className="text-lg font-medium text-gray-700">No bracket data available</p>
      </div>
    );
  }

  return (
    <BracketsViewerComponent
      bracket={bracket}
      teams={teams}
      onMatchClick={isAdminLoading || isAdminAccessGranted ? onEditMatch : undefined}
    />
  );
};
