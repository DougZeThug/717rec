
import React from "react";
import PlayoffHeader from "@/components/playoffs/PlayoffHeader";
import RealtimeIndicator from "@/components/playoffs/indicators/RealtimeIndicator";
import PlayoffDialogs from "@/components/playoffs/dialogs/PlayoffDialogs";
import { PlayoffViewSelector } from "./PlayoffViewSelector";
import { useBracketsManagerRealtime } from "@/hooks/brackets/useBracketsManagerRealtime";
import { useViewSelection } from "../hooks/useViewSelection";
import { usePlayoffHandlers } from "../hooks/usePlayoffHandlers";
import { usePlayoffViewState } from "../hooks/usePlayoffViewState";
import { PlayoffPageData } from "../hooks/usePlayoffPageData";
import { useSeasonalTheme } from "@/hooks/useSeasonalTheme";
import { cn } from "@/lib/utils";

interface PlayoffPageLayoutProps {
  data: PlayoffPageData;
}

const PlayoffPageLayout: React.FC<PlayoffPageLayoutProps> = ({ data }) => {
  const handlers = usePlayoffHandlers(data);
  const view = usePlayoffViewState(data, handlers);
  const selectedView = useViewSelection(data);
  const { shouldApplyWinterBase, winterClass } = useSeasonalTheme();
  
  // Get stageId from bracket data for realtime subscription
  const stageId = data.bracket?.stageId ?? null;
  
  // Subscribe to real-time updates for the match table (brackets-manager)
  const { realtimeEnabled } = useBracketsManagerRealtime(data.selectedBracketId, stageId);

  // Create a wrapper function that includes refetchBrackets with all 7 parameters
  const handleSaveMatchScore = React.useCallback(async (
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number }[],
    team1GameWins: number,
    team2GameWins: number,
    refetchBrackets: () => Promise<any>
  ) => {
    await handlers.handleSaveMatchScore(
      matchId,
      team1Score,
      team2Score,
      games,
      team1GameWins,
      team2GameWins,
      data.refetchBrackets
    );
  }, [handlers.handleSaveMatchScore, data.refetchBrackets]);

  return (
    <div className={cn(
      "min-h-screen py-8 px-4 md:px-8",
      shouldApplyWinterBase ? "page-winter-bg ice-pattern-bg" : "cornhole-bg",
      winterClass
    )}>
      <div className="max-w-7xl mx-auto">
        <PlayoffHeader 
          onCreateBracket={view.handleCreateBracket} 
        />
        
        <PlayoffViewSelector 
          view={selectedView}
          bracketDialogOpen={view.bracketDialogOpen}
          setBracketDialogOpen={view.setBracketDialogOpen}
          onCreateBracket={view.handleCreateBracket}
          onDeleteBracket={view.handleDeleteBracket}
          data={data}
        />
        
        {/* Realtime indicator */}
        <RealtimeIndicator enabled={!!realtimeEnabled && !!data.selectedBracketId} />
      </div>

      {/* All dialogs */}
      <PlayoffDialogs
        // Team division dialog props - only accessible through admin panel now
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
        onSaveMatchScore={handleSaveMatchScore}
        
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
