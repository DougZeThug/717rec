import { applyDropoutDivisions } from '@/constants/dropoutDivisions';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllPages } from '@/services/shared/pagination';
import { pickRealDivisions, type RealDivisionRow } from '@/utils/divisions/realDivisionOverrides';
import { handleDatabaseError } from '@/utils/errorHandler';
import { warnLog } from '@/utils/logger';

interface HiddenTeamSeasonRow {
  team_id: string;
  season_id: string;
}

interface DivisionNameRow {
  id: string;
  name: string;
  display_division: string | null;
}

const teamSeasonKey = (teamId: string, seasonId: string): string => `${teamId}_${seasonId}`;

/** Every team-season whose stored division says Hidden. */
const fetchHiddenTeamSeasons = (): Promise<HiddenTeamSeasonRow[]> =>
  fetchAllPages<HiddenTeamSeasonRow>(
    (from, to) =>
      supabase
        .from('team_season_stats')
        .select('team_id, season_id')
        .ilike('division_name', '%hidden%')
        .order('season_id', { ascending: true })
        .order('team_id', { ascending: true })
        .range(from, to),
    'Failed to fetch Hidden team seasons'
  );

/** What the Power Score decided for each game played against these teams. */
const fetchOpponentDivisionRows = (opponentIds: string[]): Promise<RealDivisionRow[]> =>
  fetchAllPages<RealDivisionRow>(
    (from, to) =>
      supabase
        .from('v_power_score_team_matches_rated')
        .select('opponent_id, season_id, opp_division_id, resolved_by, match_date')
        .in('opponent_id', opponentIds)
        .order('match_id', { ascending: true })
        .order('source', { ascending: true })
        .order('team_id', { ascending: true })
        .range(from, to),
    'Failed to fetch the Power Score division of dropped-out teams'
  );

/** Division id -> display name. The display name wins; the name is the fallback. */
const fetchDivisionNames = async (divisionIds: string[]): Promise<Map<string, string>> => {
  const { data, error } = await supabase
    .from('divisions')
    .select('id, name, display_division')
    .in('id', divisionIds);
  if (error) handleDatabaseError(error, 'Failed to fetch division names');

  const names = new Map<string, string>();
  for (const division of (data ?? []) as DivisionNameRow[]) {
    names.set(division.id, division.display_division?.trim() || division.name);
  }
  return names;
};

/**
 * The Power Score already works out an opponent's real division for each game
 * (snapshot, archive, bracket, division history, current division). Read that
 * answer for every team-season that is Hidden now.
 */
const lookUpRealDivisions = async (): Promise<Map<string, string>> => {
  const hidden = await fetchHiddenTeamSeasons();
  if (hidden.length === 0) return new Map();

  const hiddenKeys = new Set(hidden.map((row) => teamSeasonKey(row.team_id, row.season_id)));
  const opponentIds = [...new Set(hidden.map((row) => row.team_id))];
  const viewRows = await fetchOpponentDivisionRows(opponentIds);

  // The view holds every season of those teams. Keep the seasons they were Hidden in.
  const hiddenRows = viewRows.filter(
    (row) =>
      row.opponent_id &&
      row.season_id &&
      hiddenKeys.has(teamSeasonKey(row.opponent_id, row.season_id))
  );
  const divisionIds = [
    ...new Set(
      hiddenRows.map((row) => row.opp_division_id).filter((id): id is string => Boolean(id))
    ),
  ];
  if (divisionIds.length === 0) return new Map();

  return pickRealDivisions(hiddenRows, await fetchDivisionNames(divisionIds));
};

/**
 * "teamId_seasonId" -> real division name, for teams that are Hidden now. Read
 * only. Callers pass the result to `applyRealDivisions`, which uses a name only
 * where the stored division is missing or Hidden.
 *
 * Two sources: the Power Score lookup above (it covers a team that drops out
 * from now on), then Doug's list (`DROPOUT_DIVISIONS`), which WINS over it.
 *
 * Unlike most services this one does NOT throw. It only improves a division
 * split on a display page, and the same fetch feeds the career rankings and the
 * admin sandbox, so a failed lookup must not break them. On any error it logs a
 * warning and answers with Doug's list alone.
 */
export const fetchRealDivisionOverrides = async (): Promise<Map<string, string>> => {
  let lookup = new Map<string, string>();
  try {
    lookup = await lookUpRealDivisions();
  } catch (error) {
    warnLog('Could not look up the real division of dropped-out teams:', error);
  }
  return applyDropoutDivisions(lookup);
};
