import { useQuery } from '@tanstack/react-query';
import { Edit, ListOrdered, Loader2, RefreshCw, Shuffle, Trash, Wrench } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { useRecalculateStandings } from '@/hooks/useRecalculateStandings';
import { useRepairBracket } from '@/hooks/useRepairBracket';
import { fetchFinalStandings } from '@/services/brackets/BracketReadService';
import { PlayoffBracket } from '@/utils/playoffs/playoffTypes';

interface BracketAdminToolbarProps {
  bracket: PlayoffBracket;
  bracketId: string;
  onRearrange: () => void;
  onUpdateSeeding: () => void;
  onEdit: () => void;
  onDeleteBracket?: (bracketId: string, bracketName: string) => void;
}

/**
 * The admin controls above a bracket.
 *
 * Everything these buttons need — whether the bracket is completed, whether it
 * still lacks final standings, whether it can be rearranged, and the pending
 * state of the two long-running actions — is derived here rather than passed
 * in. That keeps the conditions next to the buttons they govern, and means the
 * standings query only runs for the admins who can act on it.
 */
const BracketAdminToolbar: React.FC<BracketAdminToolbarProps> = ({
  bracket,
  bracketId,
  onRearrange,
  onUpdateSeeding,
  onEdit,
  onDeleteBracket,
}) => {
  const isCompleted = bracket.state === 'completed';

  // Final standings are only worth checking once the bracket is finished; if
  // they are missing, an admin can trigger a manual recalculation.
  const { data: existingStandings } = useQuery({
    queryKey: ['final-standings', bracketId],
    queryFn: () => fetchFinalStandings(bracketId),
    enabled: Boolean(bracketId) && isCompleted,
  });
  const standingsMissing = isCompleted && (!existingStandings || existingStandings.length === 0);

  const { recalculate, isRecalculating } = useRecalculateStandings(bracketId);
  const { repair, isRepairing } = useRepairBracket(bracketId);

  // Rearranging needs a losers bracket managed by brackets-manager; the
  // format field is a display string ("Double Elimination"), so match loosely.
  const canRearrange =
    bracket.uses_brackets_manager === true &&
    (bracket.format ?? '').toLowerCase().includes('double');

  return (
    <div className="flex gap-2">
      {standingsMissing && (
        <Button
          variant="outline"
          size="sm"
          className="hidden md:flex"
          onClick={() => {
            recalculate();
          }}
          disabled={isRecalculating}
        >
          {isRecalculating ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="size-4 mr-2" />
          )}
          Recalculate Standings
        </Button>
      )}

      {!isCompleted && (
        <Button
          variant="outline"
          size="sm"
          className="hidden md:flex"
          onClick={() => {
            repair();
          }}
          disabled={isRepairing}
        >
          {isRepairing ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Wrench className="size-4 mr-2" />
          )}
          Repair Bracket
        </Button>
      )}

      {canRearrange && (
        <Button
          variant="outline"
          size="sm"
          className="hidden md:flex"
          onClick={onRearrange}
          disabled={bracket.state === 'completed'}
        >
          <Shuffle className="size-4 mr-2" /> Rearrange Teams
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        className="hidden md:flex"
        onClick={onUpdateSeeding}
        disabled={bracket.state === 'completed'}
      >
        <ListOrdered className="size-4 mr-2" /> Update Seeding
      </Button>

      <Button variant="outline" size="sm" className="hidden md:flex" onClick={onEdit}>
        <Edit className="size-4 mr-2" /> Edit Bracket
      </Button>

      {onDeleteBracket && (
        <Button
          variant="destructive"
          size="sm"
          className="hidden md:flex"
          onClick={() => onDeleteBracket(bracketId, bracket.name || '')}
        >
          <Trash className="size-4 mr-2" /> Delete
        </Button>
      )}
    </div>
  );
};

export default BracketAdminToolbar;
