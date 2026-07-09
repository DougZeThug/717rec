import { Play } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import type { Tables } from '@/integrations/supabase/types';
type TeamPlayerRow = Tables<'team_players'>;

import { PlayerSelector } from './PlayerSelector';

interface GameSetupPanelProps {
  gameNumber: number;
  team1Name: string;
  team2Name: string;
  team1Roster: TeamPlayerRow[];
  team2Roster: TeamPlayerRow[];
  initialTeam1Ids: string[];
  initialTeam2Ids: string[];
  canScore: boolean;
  isStarting: boolean;
  onStart: (team1PlayerIds: string[], team2PlayerIds: string[]) => void;
  onAddTeam1Player: (name: string) => void;
  onAddTeam2Player: (name: string) => void;
  isAddingTeam1Player: boolean;
  isAddingTeam2Player: boolean;
}

export const GameSetupPanel: React.FC<GameSetupPanelProps> = ({
  gameNumber,
  team1Name,
  team2Name,
  team1Roster,
  team2Roster,
  initialTeam1Ids,
  initialTeam2Ids,
  canScore,
  isStarting,
  onStart,
  onAddTeam1Player,
  onAddTeam2Player,
  isAddingTeam1Player,
  isAddingTeam2Player,
}) => {
  const [team1Ids, setTeam1Ids] = useState<string[]>(initialTeam1Ids);
  const [team2Ids, setTeam2Ids] = useState<string[]>(initialTeam2Ids);

  const ready = team1Ids.length > 0 && team2Ids.length > 0;

  if (!canScore) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        Waiting for a scorekeeper to start Game {gameNumber}…
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="mb-1 text-base font-semibold">Game {gameNumber} setup</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Pick who is playing this game — you can change players between games.
      </p>

      <div className="space-y-3">
        <PlayerSelector
          teamName={team1Name}
          roster={team1Roster}
          selectedIds={team1Ids}
          onChange={setTeam1Ids}
          onAddPlayer={onAddTeam1Player}
          isAddingPlayer={isAddingTeam1Player}
        />
        <PlayerSelector
          teamName={team2Name}
          roster={team2Roster}
          selectedIds={team2Ids}
          onChange={setTeam2Ids}
          onAddPlayer={onAddTeam2Player}
          isAddingPlayer={isAddingTeam2Player}
        />
      </div>

      <Button
        type="button"
        className="mt-4 min-h-[48px] w-full gap-2 text-base"
        onClick={() => onStart(team1Ids, team2Ids)}
        disabled={!ready || isStarting}
      >
        <Play className="size-4" aria-hidden />
        {isStarting ? 'Starting…' : `Start Game ${gameNumber}`}
      </Button>
      {!ready && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Select at least one player per team.
        </p>
      )}
    </div>
  );
};
