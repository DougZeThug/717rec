import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';
import { deriveMatchState } from '@/utils/liveScoring/bestOfThree';
import { foldGameTotals } from '@/utils/liveScoring/scoring';
import type { GameSummary, RoundScore, TeamSide } from '@/utils/liveScoring/types';
import { checkGameWinner } from '@/utils/liveScoring/winnerDetection';

/**
 * The ways a live-scored match can end up disagreeing with itself, worst first.
 * The card reports one kind per match: the worst one it finds.
 */
export type MatchDriftKind =
  'match-winner' | 'match-game-wins' | 'game-winner' | 'game-score' | 'game-no-rounds';

const KIND_ORDER: MatchDriftKind[] = [
  'match-winner',
  'match-game-wins',
  'game-winner',
  'game-score',
  'game-no-rounds',
];

export interface MatchResultDrift {
  id: string;
  date: string | null;
  seasonId: string | null;
  team1Name: string;
  team2Name: string;
  kind: MatchDriftKind;
  /** What the league has stored, in words. */
  recorded: string;
  /** What the rounds underneath say instead. */
  derived: string;
}

const UNKNOWN_TEAM = 'Unknown team';

type JoinedTeam = { id: string; name: string } | null;

type MatchRow = {
  id: string;
  date: string | null;
  season_id: string | null;
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
  iscompleted: boolean | null;
  team1_game_wins: number | null;
  team2_game_wins: number | null;
  team1: unknown;
  team2: unknown;
};

type GameRow = {
  id: string;
  match_id: string | null;
  game_number: number;
  status: string;
  winner_team_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
};

type RoundRow = {
  match_id: string | null;
  game_id: string | null;
  round_number: number;
  team1_score: number;
  team2_score: number;
};

interface Finding {
  kind: MatchDriftKind;
  recorded: string;
  derived: string;
}

const sideName = (
  side: TeamSide | null,
  team1Name: string,
  team2Name: string,
  fallback: string
): string => {
  if (side === 1) return team1Name;
  if (side === 2) return team2Name;
  return fallback;
};

const teamName = (
  teamId: string | null,
  match: MatchRow,
  team1Name: string,
  team2Name: string
): string => {
  if (teamId && teamId === match.team1_id) return team1Name;
  if (teamId && teamId === match.team2_id) return team2Name;
  return 'nobody';
};

/**
 * Every way this match's stored result and stored game rows disagree with the
 * rounds underneath them, worst first. Empty means the match agrees with itself.
 */
const findingsFor = (match: MatchRow, games: GameRow[], rounds: RoundRow[]): Finding[] => {
  const team1Name = (match.team1 as JoinedTeam)?.name ?? UNKNOWN_TEAM;
  const team2Name = (match.team2 as JoinedTeam)?.name ?? UNKNOWN_TEAM;
  const findings: Finding[] = [];

  const roundsByGame = new Map<string, RoundScore[]>();
  for (const r of rounds) {
    if (!r.game_id) continue;
    const list = roundsByGame.get(r.game_id);
    const score: RoundScore = { team1: r.team1_score, team2: r.team2_score };
    if (list) list.push(score);
    else roundsByGame.set(r.game_id, [score]);
  }

  // ── Game level: a completed game is written with the totals its rounds fold
  // to (LiveMatchService.completeGame), so any difference is a correction that
  // was never carried through. In-progress games are skipped: reopenGame leaves
  // the old totals in place on purpose.
  for (const game of games) {
    if (game.status !== 'completed') continue;

    const gameRounds = roundsByGame.get(game.id) ?? [];
    if (gameRounds.length === 0) {
      findings.push({
        kind: 'game-no-rounds',
        recorded: `game ${game.game_number} is completed`,
        derived: 'it has no rounds left',
      });
      continue;
    }

    const totals = foldGameTotals(gameRounds);
    const storedWinner = teamName(game.winner_team_id, match, team1Name, team2Name);
    const derivedWinnerSide = checkGameWinner(totals.team1, totals.team2);
    const derivedWinner = sideName(derivedWinnerSide, team1Name, team2Name, 'nobody yet');

    if (derivedWinnerSide !== null && storedWinner !== derivedWinner) {
      findings.push({
        kind: 'game-winner',
        recorded: `game ${game.game_number} won by ${storedWinner}`,
        derived: `its rounds give it to ${derivedWinner}`,
      });
    }

    if (game.team1_score !== totals.team1 || game.team2_score !== totals.team2) {
      findings.push({
        kind: 'game-score',
        recorded: `game ${game.game_number} stored ${game.team1_score ?? 0}–${game.team2_score ?? 0}`,
        derived: `its rounds add up to ${totals.team1}–${totals.team2}`,
      });
    }
  }

  // ── Match level: only meaningful once a result has been recorded.
  const hasResult = match.winner_id !== null || match.iscompleted === true;
  if (!hasResult) return findings;

  const summaries: GameSummary[] = games.map((g) => ({
    gameNumber: g.game_number,
    status: g.status as GameSummary['status'],
    winnerSide:
      g.winner_team_id && g.winner_team_id === match.team1_id
        ? 1
        : g.winner_team_id && g.winner_team_id === match.team2_id
          ? 2
          : null,
  }));
  const state = deriveMatchState(summaries);

  const storedWinner = teamName(match.winner_id, match, team1Name, team2Name);
  const derivedWinner = sideName(state.matchWinner, team1Name, team2Name, 'nobody');
  if (storedWinner !== derivedWinner) {
    findings.push({
      kind: 'match-winner',
      recorded: `recorded as won by ${storedWinner}`,
      derived: `its games give it to ${derivedWinner}`,
    });
  }

  if (
    match.team1_game_wins !== state.gameWins.team1 ||
    match.team2_game_wins !== state.gameWins.team2
  ) {
    findings.push({
      kind: 'match-game-wins',
      recorded: `recorded ${match.team1_game_wins ?? 0}–${match.team2_game_wins ?? 0} in games`,
      derived: `its games count ${state.gameWins.team1}–${state.gameWins.team2}`,
    });
  }

  return findings;
};

export const MatchResultDriftService = {
  /**
   * B-19: live corrections edit rounds and games without ever re-deciding the
   * result above them. `deleteRound` does not re-decide the game, and setting a
   * game winner does not re-decide the match, so a corrected match can carry a
   * recorded winner above round totals that say something else. Nothing listed
   * those matches, and the amber warning in the corrections panel was the only
   * safeguard.
   *
   * This counts the disagreement instead of storing it, the same way
   * `UnsavedLiveMatchesService` counts a decided-but-unsaved match. Empty array
   * means every live-scored match in the season agrees with its own rounds.
   *
   * `seasonId` is required and must be the active season, for the same reason
   * that card gives: the fix for a row here is to reopen and re-save the result,
   * and `finalize_live_match` increments the `teams` counters with no season
   * filter, so offering an archived season's match would add an old result to
   * the current standings.
   */
  fetchMatchResultDrift: async (seasonId: string): Promise<MatchResultDrift[]> => {
    // Step 1: the season's matches, with team names for the list.
    const { data: matchRows, error: matchError } = await supabase
      .from('matches')
      .select(
        `id, date, season_id, team1_id, team2_id, winner_id, iscompleted,
         team1_game_wins, team2_game_wins,
         team1:teams!matches_team1_id_fkey(id, name),
         team2:teams!matches_team2_id_fkey(id, name)`
      )
      .eq('season_id', seasonId)
      .order('date', { ascending: false });
    if (matchError) handleDatabaseError(matchError, 'Failed to fetch matches');

    const matches = (matchRows ?? []) as MatchRow[];
    if (matches.length === 0) return [];

    const matchIds = matches.map((m) => m.id);

    // Step 2: their live-scoring games.
    const { data: gameRows, error: gamesError } = await supabase
      .from('games')
      .select('id, match_id, game_number, status, winner_team_id, team1_score, team2_score')
      .in('match_id', matchIds);
    if (gamesError) handleDatabaseError(gamesError, 'Failed to fetch live games');

    const games = (gameRows ?? []) as GameRow[];
    if (games.length === 0) return [];

    // Step 3: the rounds those games were scored from.
    const { data: roundRows, error: roundsError } = await supabase
      .from('match_rounds')
      .select('match_id, game_id, round_number, team1_score, team2_score')
      .in('match_id', matchIds);
    if (roundsError) handleDatabaseError(roundsError, 'Failed to fetch rounds');

    const rounds = (roundRows ?? []) as RoundRow[];

    const gamesByMatch = new Map<string, GameRow[]>();
    for (const g of games) {
      if (!g.match_id) continue;
      const list = gamesByMatch.get(g.match_id);
      if (list) list.push(g);
      else gamesByMatch.set(g.match_id, [g]);
    }

    const roundsByMatch = new Map<string, RoundRow[]>();
    for (const r of rounds) {
      if (!r.match_id) continue;
      const list = roundsByMatch.get(r.match_id);
      if (list) list.push(r);
      else roundsByMatch.set(r.match_id, [r]);
    }

    const drifted: MatchResultDrift[] = [];
    for (const match of matches) {
      const matchGames = gamesByMatch.get(match.id);
      if (!matchGames || matchGames.length === 0) continue;

      const findings = findingsFor(match, matchGames, roundsByMatch.get(match.id) ?? []);
      if (findings.length === 0) continue;

      const worst = findings.reduce((a, b) =>
        KIND_ORDER.indexOf(a.kind) <= KIND_ORDER.indexOf(b.kind) ? a : b
      );

      drifted.push({
        id: match.id,
        date: match.date,
        seasonId: match.season_id,
        team1Name: (match.team1 as JoinedTeam)?.name ?? UNKNOWN_TEAM,
        team2Name: (match.team2 as JoinedTeam)?.name ?? UNKNOWN_TEAM,
        kind: worst.kind,
        recorded: worst.recorded,
        derived: worst.derived,
      });
    }

    return drifted;
  },
};
