import React from 'react';

import type { useGameFlow } from '@/hooks/live-scoring/useGameFlow';
import type { LiveGameDerived } from '@/hooks/live-scoring/useLiveMatch';
import type { useTeamPlayers } from '@/hooks/live-scoring/useTeamPlayers';
import type { LiveMatchBundle } from '@/services/liveScoring/LiveMatchService';

import { GameSetupPanel } from './GameSetupPanel';
import { ReopenGameButton } from './ReopenGameButton';
import { RoundLog } from './RoundLog';

type TeamPlayers = ReturnType<typeof useTeamPlayers>;

interface NextGameSetupPanelProps {
  nextGameNumber: number | null;
  team1Name: string;
  team2Name: string;
  team1Id: string | null;
  team2Id: string | null;
  team1Players: TeamPlayers;
  team2Players: TeamPlayers;
  previousGame: LiveGameDerived | null;
  rounds: LiveMatchBundle['rounds'];
  playerNames: Record<string, string>;
  canScore: boolean;
  startGame: ReturnType<typeof useGameFlow>['startGame'];
  reopenGame: ReturnType<typeof useGameFlow>['reopenGame'];
}

/** Reuses the previous game's players when they still belong to that roster. */
const prefillFrom = (
  previousPlayers: { player_id: string }[] | undefined,
  roster: { id: string }[]
): string[] => {
  const rosterIds = new Set(roster.map((player) => player.id));

  return (previousPlayers ?? []).reduce<string[]>((ids, gamePlayer) => {
    if (rosterIds.has(gamePlayer.player_id)) ids.push(gamePlayer.player_id);
    return ids;
  }, []);
};

/** Picking players for the next game, once no game is in progress. */
export const NextGameSetupPanel: React.FC<NextGameSetupPanelProps> = ({
  nextGameNumber,
  team1Name,
  team2Name,
  team1Id,
  team2Id,
  team1Players,
  team2Players,
  previousGame,
  rounds,
  playerNames,
  canScore,
  startGame,
  reopenGame,
}) => {
  if (nextGameNumber === null) {
    // Shouldn't happen (all 3 games completed without a 2-win side means
    // corrupted data) — degrade to the round history instead of a blank page.
    return (
      <div className="space-y-3">
        <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          The games in this match look inconsistent. An admin can reopen a game to fix the scores.
        </div>
        <RoundLog
          rounds={rounds}
          team1Name={team1Name}
          team2Name={team2Name}
          playerNames={playerNames}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <GameSetupPanel
        key={`setup-game-${nextGameNumber}`}
        gameNumber={nextGameNumber}
        team1Name={team1Name}
        team2Name={team2Name}
        team1Roster={team1Players.players}
        team2Roster={team2Players.players}
        initialTeam1Ids={prefillFrom(previousGame?.players.team1, team1Players.players)}
        initialTeam2Ids={prefillFrom(previousGame?.players.team2, team2Players.players)}
        canScore={canScore}
        isStarting={startGame.isPending}
        onStart={(team1Ids, team2Ids) =>
          startGame.mutate({
            gameNumber: nextGameNumber,
            team1Id: team1Id ?? '',
            team2Id: team2Id ?? '',
            team1PlayerIds: team1Ids,
            team2PlayerIds: team2Ids,
          })
        }
        onAddTeam1Player={(name) => team1Players.addPlayer.mutate(name)}
        onAddTeam2Player={(name) => team2Players.addPlayer.mutate(name)}
        isAddingTeam1Player={team1Players.addPlayer.isPending}
        isAddingTeam2Player={team2Players.addPlayer.isPending}
      />
      {canScore && previousGame && (
        <ReopenGameButton
          gameNumber={previousGame.game.game_number}
          isPending={reopenGame.isPending}
          onReopen={() => reopenGame.mutate(previousGame.game.id)}
        />
      )}
    </div>
  );
};
