
import React from "react";
import PlayoffHeader from "@/components/playoffs/PlayoffHeader";
import RealtimeIndicator from "@/components/playoffs/indicators/RealtimeIndicator";
import PlayoffDialogs from "@/components/playoffs/dialogs/PlayoffDialogs";
import { usePlayoffRealtime } from "@/hooks/usePlayoffRealtime";
import { PlayoffPageData } from "../hooks/usePlayoffPageData";
import { PlayoffHandlers } from "../hooks/usePlayoffHandlers";
import { PlayoffViewState } from "../hooks/usePlayoffViewState";

interface PlayoffPageLayoutProps {
  data: PlayoffPageData;
  view: PlayoffViewState;
  handlers: PlayoffHandlers;
  children: React.ReactNode;
}

const PlayoffPageLayout: React.FC<PlayoffPageLayoutProps> = ({
  data,
  view,
  handlers,
  children
}) => {
  // Subscribe to real-time updates for the selected bracket
  const { realtimeEnabled, lastUpdatedMatch } = usePlayoffRealtime(data.selectedBracketId);
  
  // Refetch bracket data when we receive a real-time update
  React.useEffect(() => {
    if (lastUpdatedMatch && data.selectedBracketId) {
      data.refetchBrackets();
    }
  }, [lastUpdatedMatch, data.refetchBrackets, data.selectedBracketId]);

  return (
    <div className="min-h-screen cornhole-bg py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <PlayoffHeader 
          onCreateBracket={view.handleCreateBracket} 
          onOpenTeamDialog={() => view.setTeamDialogOpen(true)} 
        />
        
        {children}
        
        {/* Realtime indicator */}
        <RealtimeIndicator enabled={!!realtimeEnabled && !!data.selectedBracketId} />
      </div>

      {/* All dialogs */}
      <PlayoffDialogs
        // Team division dialog props
        teamDialogOpen={view.teamDialogOpen}
        setTeamDialogOpen={view.setTeamDialogOpen}
        teamsByDivision={data.teamsByDivision}
        availableDivisions={data.availableDivisions}
        teamsLoading={data.teamsLoading}
        onTeamDivisionChange={data.handleTeamDivisionChange}
        
        // Bracket creation dialog props
        bracketDialogOpen={view.bracketDialogOpen}
        setBracketDialogOpen={view.setBracketDialogOpen}
        divisions={data.divisions}
        teams={data.teams}
        onBracketCreated={data.handleBracketCreated}
        
        // Match editor props
        editingMatch={handlers.editingMatch}
        isQuickEdit={handlers.isQuickEdit}
        onCloseMatchEditor={handlers.handleCloseMatchEditor}
        onSaveMatchScore={handlers.handleSaveScore}
        
        // Delete bracket props
        deletingBracket={view.deletingBracket}
        setDeletingBracket={view.setDeletingBracket}
        onConfirmDelete={view.handleConfirmDeleteBracket}
        isDeleting={view.isDeleting}
      />
    </div>
  );
};

export default PlayoffPageLayout;
