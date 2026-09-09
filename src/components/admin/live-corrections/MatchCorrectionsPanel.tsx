import React, { useCallback, useState } from 'react';

import { LoadingState } from '@/components/ui/loading-state';
import { useAdminCorrections } from '@/hooks/live-scoring/useAdminCorrections';
import { useLiveMatch } from '@/hooks/live-scoring/useLiveMatch';
import { useSeasons } from '@/hooks/useSeasons';
import { isMatchCompleted } from '@/utils/matchStatus';

import { ArchivedSeasonBanner } from './ArchivedSeasonBanner';
import { GameCorrectionCard } from './GameCorrectionCard';
import { type CorrectionSelection, MatchCorrectionDialogs } from './MatchCorrectionDialogs';
import { ReopenAndResaveNotice } from './ReopenAndResaveNotice';
import { useMatchRosters } from './useMatchRosters';

const NO_SELECTION: CorrectionSelection = {
  editingRoundId: null,
  deletingRoundId: null,
  winnerGameId: null,
};

export interface MatchCorrectionsPanelProps {
  matchId: string;
}

/** Admin panel for editing rounds, deleting rounds, and changing game winners on a match. */
export const MatchCorrectionsPanel: React.FC<MatchCorrectionsPanelProps> = ({ matchId }) => {
  const { bundle, derived, isLoading, isNotEnabled } = useLiveMatch(matchId);
  const finalized = bundle ? isMatchCompleted(bundle.match) : false;

  // B-20: an archived season is frozen. Read it from this match's own season
  // rather than from the section's season filter, because a selected match stays
  // open when the filter changes. useSeasons is already cached by the section, so
  // this costs no extra request.
  const { data: seasons } = useSeasons();
  const matchSeason = (seasons ?? []).find((s) => s.id === bundle?.match.season_id) ?? null;
  const seasonArchived = matchSeason?.is_archived === true;

  const corrections = useAdminCorrections({ matchId, affectsStandings: finalized });

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

  const team1Id = bundle?.match.team1_id ?? null;
  const team2Id = bundle?.match.team2_id ?? null;
  const rosterById = useMatchRosters(team1Id, team2Id);

  if (isLoading) return <LoadingState variant="section" message="Loading match…" />;
  if (isNotEnabled || !bundle || !derived) {
    return <p className="text-sm text-muted-foreground">No live-scoring data for this match.</p>;
  }

  const team1 = { id: team1Id, name: bundle.match.team1?.name ?? 'Team 1' };
  const team2 = { id: team2Id, name: bundle.match.team2?.name ?? 'Team 2' };

  return (
    <div className="space-y-4">
      {seasonArchived && <ArchivedSeasonBanner seasonName={matchSeason?.name ?? null} />}

      {/* Nothing can be edited into disagreeing on an archived season, so the
          finalized warning and its one-press fix belong only to a live one. */}
      {finalized && !seasonArchived && <ReopenAndResaveNotice matchId={matchId} />}

      {derived.games.map((g) => (
        <GameCorrectionCard
          key={g.game.id}
          game={g}
          rounds={bundle.rounds.filter((r) => r.game_id === g.game.id)}
          team1Id={team1.id}
          team2Id={team2.id}
          team1Name={team1.name}
          team2Name={team2.name}
          readOnly={seasonArchived}
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
