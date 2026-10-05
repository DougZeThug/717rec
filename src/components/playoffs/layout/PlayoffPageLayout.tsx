import React from 'react';

import PlayoffDialogs from '@/components/playoffs/dialogs/PlayoffDialogs';
import { ChallongeFallback } from '@/components/playoffs/embeds/ChallongeFallback';
import RealtimeIndicator from '@/components/playoffs/indicators/RealtimeIndicator';
import PlayoffHeader from '@/components/playoffs/PlayoffHeader';
import SeasonSelector from '@/components/playoffs/SeasonSelector';
import { useBracketsManagerRealtime } from '@/hooks/brackets/useBracketsManagerRealtime';
import { useChallongeFallbackConfig } from '@/hooks/useChallongeFallback';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import type { AsyncVoidCallback } from '@/types/callbacks';

import { usePlayoffHandlers } from '../hooks/usePlayoffHandlers';
import { PlayoffPageData } from '../hooks/usePlayoffPageData';
import { usePlayoffViewState } from '../hooks/usePlayoffViewState';
import { useViewSelection } from '../hooks/useViewSelection';
import { PlayoffViewSelector } from './PlayoffViewSelector';

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

  const { data: challongeConfig } = useChallongeFallbackConfig();
  const showChallongeFallback =
    !data.isLoading && !data.selectedBracketId && challongeConfig?.enabled === true;

  // Create a wrapper function that includes refetchBrackets with all 7 parameters
  const handleSaveMatchScore = React.useCallback(
    async (
      matchId: string,
      team1Score: number,
      team2Score: number,
      games: { team1Score: number; team2Score: number }[],
      team1GameWins: number,
      team2GameWins: number,
      _refetchBrackets: AsyncVoidCallback
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers object identity churns each render
    [handlers.handleSaveMatchScore, data.refetchBrackets]
  );

  return (
    <div
      className={cn(
        'min-h-screen supports-[height:100dvh]:min-h-dvh py-4 px-3 md:py-8 md:px-8 pb-8',
        shouldApplyWinterBase ? 'page-winter-bg ice-pattern-bg' : 'cornhole-bg',
        winterClass
      )}
    >
      <div className="max-w-7xl mx-auto">
        <PlayoffHeader selectedSeasonId={data.selectedSeasonId} />

        {/* Season selector, at the top on every screen size. On a phone it used
            to be a `fixed bottom-0` bar, but every route sits inside a box with
            `contain: layout`, so that bar never pinned: it sat at the end of the
            page, and the tab bar covered it there. */}
        <div className="mb-4">
          <SeasonSelector
            selectedSeasonId={data.selectedSeasonId}
            onSeasonChange={data.setSelectedSeasonId}
          />
        </div>

        {showChallongeFallback && (
          <div className="mb-8">
            <ChallongeFallback />
          </div>
        )}

        <PlayoffViewSelector
          view={selectedView}
          bracketDialogOpen={view.bracketDialogOpen}
          setBracketDialogOpen={view.setBracketDialogOpen}
          onCreateBracket={view.handleCreateBracket}
          onDeleteBracket={view.handleDeleteBracket}
          onEditMatch={handlers.handleEditMatch}
          data={data}
        />

        {/* Realtime indicator */}
        <RealtimeIndicator enabled={Boolean(realtimeEnabled) && Boolean(data.selectedBracketId)} />
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
        seasonId={data.selectedSeasonId}
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
