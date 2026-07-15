import { ClipboardList, ExternalLink } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useLiveMatch } from '@/hooks/live-scoring/useLiveMatch';
import { useTeamPlayers } from '@/hooks/live-scoring/useTeamPlayers';
import { buildPlayerTeamMap, computeMatchRecap } from '@/utils/liveScoring/matchRecap';

import { MatchRecapSummary } from './MatchRecapSummary';

interface MatchRecapDialogProps {
  matchId: string;
  team1Name: string;
  team2Name: string;
  trigger: React.ReactNode;
}

export const MatchRecapDialog: React.FC<MatchRecapDialogProps> = ({
  matchId,
  team1Name,
  team2Name,
  trigger,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="size-4 text-primary" aria-hidden />
            Match Recap
          </DialogTitle>
          <DialogDescription>
            {team1Name} vs {team2Name}
          </DialogDescription>
        </DialogHeader>
        {open && <RecapBody matchId={matchId} />}
      </DialogContent>
    </Dialog>
  );
};

const RecapBody: React.FC<{ matchId: string }> = ({ matchId }) => {
  const { bundle, derived, isLoading, error } = useLiveMatch(matchId);
  const team1Players = useTeamPlayers(bundle?.match.team1_id ?? undefined);
  const team2Players = useTeamPlayers(bundle?.match.team2_id ?? undefined);

  const playerNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const p of [...team1Players.players, ...team2Players.players]) {
      names[p.id] = p.display_name;
    }
    return names;
  }, [team1Players.players, team2Players.players]);

  const recap = useMemo(() => {
    if (!bundle || !derived) return null;
    const playerTeamMap = buildPlayerTeamMap(
      bundle.gamePlayers.map((gp) => ({ player_id: gp.player_id, team_id: gp.team_id })),
      bundle.match.team1_id
    );
    return computeMatchRecap({
      rounds: bundle.rounds,
      games: derived.games,
      playerNames,
      playerTeamMap,
      team1Id: bundle.match.team1_id,
      team2Id: bundle.match.team2_id,
      team1Name: bundle.match.team1?.name ?? 'Team 1',
      team2Name: bundle.match.team2?.name ?? 'Team 2',
    });
  }, [bundle, derived, playerNames]);

  if (isLoading) {
    return (
      <div className="space-y-3" aria-label="Loading recap">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error || !bundle || !derived) {
    return <p className="text-sm text-muted-foreground">Couldn&apos;t load recap details.</p>;
  }

  const gameWins = {
    team1: bundle.match.team1_game_wins ?? 0,
    team2: bundle.match.team2_game_wins ?? 0,
  };
  const winnerName =
    bundle.match.winner_id === bundle.match.team1_id
      ? bundle.match.team1?.name
      : bundle.match.winner_id === bundle.match.team2_id
        ? bundle.match.team2?.name
        : null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4 text-center">
        <p className="text-sm font-semibold">{winnerName ? `${winnerName} won` : 'Final'}</p>
        <p className="font-display text-3xl font-bold tabular-nums">
          {gameWins.team1}–{gameWins.team2}
        </p>
      </div>
      {recap && <MatchRecapSummary recap={recap} />}
      <Link
        to={`/matches/${matchId}/live`}
        className="flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg bg-muted text-sm font-medium text-foreground/80 transition-colors hover:bg-muted/70"
      >
        Open full recap
        <ExternalLink className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
};
