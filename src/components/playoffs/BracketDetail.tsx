import { useQuery } from '@tanstack/react-query';
import { Edit, ListOrdered, Loader2, RefreshCw, Shuffle, Trash, Wrench } from 'lucide-react';
import { useTheme } from 'next-themes';
import React, { useState } from 'react';

import BracketView from '@/components/playoffs/BracketView';
import ChampionDisplay from '@/components/playoffs/ChampionDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useRecalculateStandings } from '@/hooks/useRecalculateStandings';
import { useRepairBracket } from '@/hooks/useRepairBracket';
import { cn } from '@/lib/utils';
import {
  fetchBracketParticipants,
  fetchFinalStandings,
} from '@/services/brackets/BracketReadService';
import { blueAmber } from '@/styles/design-system';
import { getDivisionSoftClasses } from '@/utils/colors/divisionColors';
import { PlayoffBracket, Team } from '@/utils/playoffs/playoffTypes';

import EditBracketDialog from './admin/EditBracketDialog';
import RearrangeBracketDialog from './admin/RearrangeBracketDialog';
import { SeedingUpdateDialog } from './SeedingUpdateDialog';

interface BracketDetailProps {
  bracketId: string;
  bracket: PlayoffBracket | null;
  teams: Team[];
  bracketLoading: boolean;
  onEditMatch?: (matchId: string) => void;
  onDeleteBracket?: (bracketId: string, bracketName: string) => void;
}

// Softer, league-standard tier accent for the bracket card top border
const getDivisionColorClass = (division: string) => getDivisionSoftClasses(division).borderTop;

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
    enabled: !!bracketId && isCompleted,
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
          onClick={() => void recalculate()}
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
          onClick={() => void repair()}
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

const BracketDetail: React.FC<BracketDetailProps> = ({
  bracketId,
  bracket,
  teams,
  bracketLoading,
  onEditMatch,
  onDeleteBracket,
}) => {
  const { isAdminAccessGranted } = useAdminAccess();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const [seedingDialogOpen, setSeedingDialogOpen] = useState(false);
  const [rearrangeDialogOpen, setRearrangeDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Fetch current participants for seeding updates
  const { data: participants } = useQuery({
    queryKey: ['bracket-participants', bracketId],
    queryFn: () => fetchBracketParticipants(bracketId),
    enabled: !!bracketId,
  });

  // Early return if bracket is not loaded
  if (!bracket) {
    return (
      <Card className="mb-8">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'mb-8 overflow-hidden',
        'border-t-4',
        getDivisionColorClass(bracket.division || ''),
        isLight ? blueAmber.background.card : ''
      )}
      id={`bracket-${bracketId}`}
    >
      <CardHeader className="bg-gradient-to-r from-transparent via-blue-50/30 to-amber-50/20 dark:from-transparent dark:via-gray-800/30 dark:to-gray-900/80">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle
              className={cn(
                blueAmber.text.heading,
                'text-2xl font-bold tracking-tight',
                'heading-winter'
              )}
            >
              {bracket.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <span className="font-medium">{bracket.division} Division</span>
              <span className="text-muted-foreground">•</span>
              <span>{bracket.format}</span>
              {bracket.state && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      bracket.state === 'pending'
                        ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        : bracket.state === 'in_progress'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    )}
                  >
                    {bracket.state.charAt(0).toUpperCase() + bracket.state.slice(1)}
                  </span>
                </>
              )}
            </CardDescription>
          </div>
          {isAdminAccessGranted && (
            <BracketAdminToolbar
              bracket={bracket}
              bracketId={bracketId}
              onRearrange={() => setRearrangeDialogOpen(true)}
              onUpdateSeeding={() => setSeedingDialogOpen(true)}
              onEdit={() => setEditDialogOpen(true)}
              onDeleteBracket={onDeleteBracket}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {bracketLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 animate-spin text-cornhole-navy" />
          </div>
        ) : (
          <>
            <BracketView
              bracketId={bracketId}
              bracket={bracket}
              teams={teams || []}
              onEditMatch={isAdminAccessGranted ? onEditMatch : undefined}
            />

            <ChampionDisplay championId={bracket.champion} teams={teams} />
          </>
        )}
      </CardContent>

      <SeedingUpdateDialog
        open={seedingDialogOpen}
        onOpenChange={setSeedingDialogOpen}
        bracketId={bracketId}
        bracketName={bracket.name ?? ''}
        currentParticipants={(participants || []).map((p) => ({ ...p, name: p.name ?? '' }))}
        bracketState={bracket.state || 'pending'}
      />

      <RearrangeBracketDialog
        open={rearrangeDialogOpen}
        onOpenChange={setRearrangeDialogOpen}
        bracketId={bracketId}
      />

      {/* Mounted only while open, so the form always starts from the bracket's
          current values. */}
      {editDialogOpen && (
        <EditBracketDialog open onOpenChange={setEditDialogOpen} bracket={bracket} />
      )}
    </Card>
  );
};

export default BracketDetail;
