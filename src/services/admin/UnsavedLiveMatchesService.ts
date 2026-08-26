import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';
import { GAMES_TO_WIN_MATCH } from '@/utils/liveScoring/rules';

export interface UnsavedLiveMatch {
  id: string;
  date: string | null;
  seasonId: string | null;
  team1Name: string;
  team2Name: string;
  team1GameWins: number;
  team2GameWins: number;
}

const UNKNOWN_TEAM = 'Unknown team';

type JoinedTeam = { id: string; name: string } | null;

export const UnsavedLiveMatchesService = {
  /**
   * Matches that live scoring already decided but whose official result was
   * never saved: a side has won GAMES_TO_WIN_MATCH games, yet the match still
   * has no winner and is not completed.
   *
   * This is the same condition `finalize_live_match` checks before it writes
   * the result — counted here from the stored `games` rows instead, so the
   * state is visible without anything being persisted for it. Empty array
   * means every decided match has been recorded.
   */
  fetchUnsavedLiveMatches: async (seasonId?: string | null): Promise<UnsavedLiveMatch[]> => {
    // Step 1: matches the league has no result for. `iscompleted` is nullable,
    // so exclude only `true` — matching finalize_live_match's COALESCE.
    let matchQuery = supabase
      .from('matches')
      .select(
        `id, date, season_id, team1_id, team2_id,
         team1:teams!matches_team1_id_fkey(id, name),
         team2:teams!matches_team2_id_fkey(id, name)`
      )
      .not('iscompleted', 'is', true)
      .is('winner_id', null)
      .order('date', { ascending: false });

    if (seasonId) matchQuery = matchQuery.eq('season_id', seasonId);

    const { data: matchRows, error: matchError } = await matchQuery;
    if (matchError) handleDatabaseError(matchError, 'Failed to fetch unrecorded matches');

    const unrecorded = matchRows ?? [];
    if (unrecorded.length === 0) return [];

    // Step 2: the completed live-scoring games belonging to those matches.
    const { data: gameRows, error: gamesError } = await supabase
      .from('games')
      .select('match_id, winner_team_id')
      .eq('status', 'completed')
      .in(
        'match_id',
        unrecorded.map((m) => m.id)
      );

    if (gamesError) handleDatabaseError(gamesError, 'Failed to fetch completed live games');

    const winnersByMatch = new Map<string, string[]>();
    for (const g of gameRows ?? []) {
      if (!g.match_id || !g.winner_team_id) continue;
      const winners = winnersByMatch.get(g.match_id);
      if (winners) winners.push(g.winner_team_id);
      else winnersByMatch.set(g.match_id, [g.winner_team_id]);
    }

    // Step 3: keep only the matches a side actually won. Game wins are counted
    // per team id, the same way deriveMatchState counts them on the live screen.
    const decided: UnsavedLiveMatch[] = [];
    for (const m of unrecorded) {
      const winners = winnersByMatch.get(m.id);
      if (!winners) continue;

      const team1GameWins = winners.filter((id) => id === m.team1_id).length;
      const team2GameWins = winners.filter((id) => id === m.team2_id).length;
      if (Math.max(team1GameWins, team2GameWins) < GAMES_TO_WIN_MATCH) continue;

      decided.push({
        id: m.id,
        date: m.date,
        seasonId: m.season_id,
        team1Name: (m.team1 as JoinedTeam)?.name ?? UNKNOWN_TEAM,
        team2Name: (m.team2 as JoinedTeam)?.name ?? UNKNOWN_TEAM,
        team1GameWins,
        team2GameWins,
      });
    }

    return decided;
  },
};
