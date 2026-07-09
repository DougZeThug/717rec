import type { Tables } from '@/integrations/supabase/types';
type MatchRoundRow = Tables<'match_rounds'>;

import { computePlayerStatLines, type PlayerStatLine } from './matchPlayerStats';
import { percentage, pointsPerRound } from './pprCalc';

export type TeamSide = 1 | 2;

/** Minimum rounds a player must have thrown to qualify as "Top Performer". */
export const TOP_PERFORMER_MIN_ROUNDS = 2;
/** Minimum bag-tracked bags a player must have to qualify as "Most Consistent". */
export const MOST_CONSISTENT_MIN_BAGS = 4;

export interface RecapPlayer {
  playerId: string;
  name: string;
  roundsThrown: number;
  ppr: number | null;
  bagsIn: number;
  bagsOn: number;
  bagsOff: number;
  totalBags: number;
  holePct: number | null;
  boardPct: number | null;
  offPct: number | null;
}

export interface RecapTeam {
  side: TeamSide;
  name: string;
  bagTotals: { in: number; on: number; off: number; total: number };
  players: RecapPlayer[];
}

export interface RecapKeyGame {
  gameNumber: number;
  team1Score: number;
  team2Score: number;
  winnerName: string | null;
  margin: number;
}

export interface RecapTopPerformer {
  playerId: string;
  name: string;
  ppr: number;
  holePct: number | null;
}

export interface RecapMostConsistent {
  playerId: string;
  name: string;
  offPct: number;
}

export interface MatchRecap {
  topPerformer: RecapTopPerformer | null;
  mostConsistent: RecapMostConsistent | null;
  keyGame: RecapKeyGame | null;
  teams: RecapTeam[];
}

/** Minimal shape needed to pick the "Key Game" — matches LiveGameDerived. */
export interface GameForRecap {
  game: { id: string; game_number: number; winner_team_id: string | null };
  totals: { team1: number; team2: number };
}

export interface ComputeMatchRecapInput {
  rounds: MatchRoundRow[];
  games: GameForRecap[];
  playerNames: Record<string, string>;
  /** Map of player_id -> which side (1 or 2) they play for. */
  playerTeamMap: Record<string, TeamSide>;
  team1Id: string | null;
  team2Id: string | null;
  team1Name: string;
  team2Name: string;
}

function toRecapPlayer(line: PlayerStatLine, name: string): RecapPlayer {
  return {
    playerId: line.playerId,
    name,
    roundsThrown: line.roundsThrown,
    ppr: line.ppr,
    bagsIn: line.bagsIn,
    bagsOn: line.bagsOn,
    bagsOff: line.bagsOff,
    totalBags: line.totalBags,
    holePct: percentage(line.bagsIn, line.totalBags),
    boardPct: percentage(line.bagsOn, line.totalBags),
    offPct: percentage(line.bagsOff, line.totalBags),
  };
}

function pickTopPerformer(players: RecapPlayer[]): RecapTopPerformer | null {
  const eligible = players.filter(
    (p) => p.roundsThrown >= TOP_PERFORMER_MIN_ROUNDS && p.ppr !== null
  );
  if (eligible.length === 0) return null;
  const best = [...eligible].sort((a, b) => {
    const pprDelta = (b.ppr ?? 0) - (a.ppr ?? 0);
    if (pprDelta !== 0) return pprDelta;
    // Tie-break: higher hole rate wins; nulls last.
    return (b.holePct ?? -1) - (a.holePct ?? -1);
  })[0];
  return {
    playerId: best.playerId,
    name: best.name,
    ppr: best.ppr as number,
    holePct: best.holePct,
  };
}

function pickMostConsistent(players: RecapPlayer[]): RecapMostConsistent | null {
  const eligible = players.filter(
    (p) => p.totalBags >= MOST_CONSISTENT_MIN_BAGS && p.offPct !== null
  );
  if (eligible.length === 0) return null;
  const best = [...eligible].sort((a, b) => (a.offPct ?? 100) - (b.offPct ?? 100))[0];
  return {
    playerId: best.playerId,
    name: best.name,
    offPct: best.offPct as number,
  };
}

function pickKeyGame(
  games: GameForRecap[],
  team1Id: string | null,
  team1Name: string,
  team2Name: string
): RecapKeyGame | null {
  if (games.length === 0) return null;
  // Closest margin wins; ties broken by later game number (more decisive spot).
  const sorted = [...games].sort((a, b) => {
    const marginA = Math.abs(a.totals.team1 - a.totals.team2);
    const marginB = Math.abs(b.totals.team1 - b.totals.team2);
    if (marginA !== marginB) return marginA - marginB;
    return b.game.game_number - a.game.game_number;
  });
  const g = sorted[0];
  const winnerName =
    g.game.winner_team_id === null
      ? null
      : g.game.winner_team_id === team1Id
        ? team1Name
        : team2Name;
  return {
    gameNumber: g.game.game_number,
    team1Score: g.totals.team1,
    team2Score: g.totals.team2,
    winnerName,
    margin: Math.abs(g.totals.team1 - g.totals.team2),
  };
}

function teamBagTotals(
  rounds: MatchRoundRow[],
  side: TeamSide
): { in: number; on: number; off: number; total: number } {
  let bagsIn = 0;
  let bagsOn = 0;
  let bagsOff = 0;
  for (const r of rounds) {
    const i = side === 1 ? r.team1_bags_in : r.team2_bags_in;
    const o = side === 1 ? r.team1_bags_on : r.team2_bags_on;
    const f = side === 1 ? r.team1_bags_off : r.team2_bags_off;
    if (i == null || o == null || f == null) continue;
    bagsIn += i;
    bagsOn += o;
    bagsOff += f;
  }
  return { in: bagsIn, on: bagsOn, off: bagsOff, total: bagsIn + bagsOn + bagsOff };
}

export function computeMatchRecap(input: ComputeMatchRecapInput): MatchRecap {
  const {
    rounds,
    games,
    playerNames,
    playerTeamMap,
    team1Id,
    team2Id,
    team1Name,
    team2Name,
  } = input;

  const lines = computePlayerStatLines(rounds).map((line) =>
    toRecapPlayer(line, playerNames[line.playerId] ?? 'Former player')
  );

  const forSide = (side: TeamSide) =>
    lines
      .filter((p) => playerTeamMap[p.playerId] === side)
      .sort((a, b) => b.roundsThrown - a.roundsThrown || (b.ppr ?? 0) - (a.ppr ?? 0));

  const teams: RecapTeam[] = [
    {
      side: 1,
      name: team1Name,
      bagTotals: teamBagTotals(rounds, 1),
      players: forSide(1),
    },
    {
      side: 2,
      name: team2Name,
      bagTotals: teamBagTotals(rounds, 2),
      players: forSide(2),
    },
  ];

  return {
    topPerformer: pickTopPerformer(lines),
    mostConsistent: pickMostConsistent(lines),
    keyGame: pickKeyGame(games, team1Id, team1Name, team2Name),
    teams,
  };
}

/**
 * Build a player_id -> team side map from a list of game_players rows.
 * Used by callers that have the raw bundle.
 */
export function buildPlayerTeamMap(
  gamePlayers: ReadonlyArray<{ player_id: string; team_id: string }>,
  team1Id: string | null
): Record<string, TeamSide> {
  const map: Record<string, TeamSide> = {};
  for (const gp of gamePlayers) {
    if (map[gp.player_id]) continue;
    map[gp.player_id] = gp.team_id === team1Id ? 1 : 2;
  }
  return map;
}

// Re-export for tests that want to construct example PlayerStatLines directly.
export { pointsPerRound };