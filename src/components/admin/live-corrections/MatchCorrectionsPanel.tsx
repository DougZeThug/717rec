import React, { useCallback, useState } from 'react';

import { LoadingState } from '@/components/ui/loading-state';
import { useAdminCorrections } from '@/hooks/live-scoring/useAdminCorrections';
import type { LiveMatchDerived } from '@/hooks/live-scoring/useLiveMatch';
import { useLiveMatch } from '@/hooks/live-scoring/useLiveMatch';
import type { LiveMatchBundle } from '@/services/liveScoring/LiveMatchService';
import { isMatchCompleted } from '@/utils/matchStatus';

import { ArchivedSeasonBanner } from './ArchivedSeasonBanner';
import { GameCorrectionCard } from './GameCorrectionCard';
import { type CorrectionSelection, MatchCorrectionDialogs } from './MatchCorrectionDialogs';
import { ReopenAndResaveNotice } from './ReopenAndResaveNotice';
import { useMatchRosters } from './useMatchRosters';
import { useMatchSeason } from './useMatchSeason';

const NO_SELECTION: CorrectionSelection = {
  editingRoundId: null,
  deletingRoundId: null,
  winnerGameId: null,
};

interface LoadedProps {
  matchId: string;
  bundle: LiveMatchBundle;
  derived: LiveMatchDerived;
}

/** The panel once the match is known to exist. Split out so nothing below has
 *  to cope with a missing bundle. */
const LoadedMatchCorrections: React.FC<LoadedProps> = ({ matchId, bundle, derived }) => {
  const finalized = isMatchCompleted(bundle.match);
  const season = useMatchSeason(bundle.match.season_id);
  const corrections = useAdminCorrections({ matchId, affectsStandings: finalized });
  const rosterById = useMatchRosters(bundle.match.team1_id, bundle.match.team2_id);

  // Store only IDs; the dialogs derive their row from the realtime-updated
  // bundle, so an open dialog always reflects the latest data and closes itself
  // if the round disappears.
  const [selection, setSelection] = useState<CorrectionSelection>(NO_SELECTION);
  const select = useCallback(
    (which: keyof CorrectionSelection) => (id: string | null) =>
      setSelection((prev) => ({ ...prev, [which]: id })),
    []
  );
  const clearSelection = useCallback(
    (which: keyof CorrectionSelection) => setSelection((prev) => ({ ...prev, [which]: null })),
    []
  );

  const team1 = { id: bundle.match.team1_id, name: bundle.match.team1?.name ?? 'Team 1' };
  const team2 = { id: bundle.match.team2_id, name: bundle.match.team2?.name ?? 'Team 2' };

  return (
    <div className="space-y-4">
      {season.isArchived && <ArchivedSeasonBanner seasonName={season.name} />}

      {/* Nothing can be edited into disagreeing on an archived season, so the
          finalized warning and its one-press fix belong only to a live one. */}
      {finalized && !season.isArchived && <ReopenAndResaveNotice matchId={matchId} />}

      {derived.games.map((g) => (
        <GameCorrectionCard
          key={g.game.id}
          game={g}
          rounds={bundle.rounds.filter((r) => r.game_id === g.game.id)}
          team1Id={team1.id}
          team2Id={team2.id}
          team1Name={team1.name}
          team2Name={team2.name}
          readOnly={season.isArchived}
          onEditRound={select('editingRoundId')}
          onDeleteRound={select('deletingRoundId')}
          onChangeWinner={select('winnerGameId')}
        />
      ))}

      <MatchCorrectionDialogs
        selection={selection}
        clearSelection={clearSelection}
        rounds={bundle.rounds}
        derived={derived}
        team1={team1}
        team2={team2}
        rosterById={rosterById}
        corrections={corrections}
      />
    </div>
  );
};

export interface MatchCorrectionsPanelProps {
  matchId: string;
}

/** Admin panel for editing rounds, deleting rounds, and changing game winners on a match. */
export const MatchCorrectionsPanel: React.FC<MatchCorrectionsPanelProps> = ({ matchId }) => {
  const { bundle, derived, isLoading, isNotEnabled } = useLiveMatch(matchId);

  if (isLoading) return <LoadingState variant="section" message="Loading match…" />;
  if (isNotEnabled || !bundle || !derived) {
    return <p className="text-sm text-muted-foreground">No live-scoring data for this match.</p>;
  }

  return <LoadedMatchCorrections matchId={matchId} bundle={bundle} derived={derived} />;
};
