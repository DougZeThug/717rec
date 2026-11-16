/**
 * Pure helpers that file a game against a dropped-out team under the team's
 * REAL division.
 *
 * Hidden is where an admin moves a team after it drops out. The move overwrites
 * the stored division, so a division map built from stored names says "Hidden"
 * for games that were played against a Competitive, Intermediate or
 * Recreational team. These helpers pick the real name and put it into such a
 * map, only where the stored name is missing or Hidden.
 */

/** The columns of `v_power_score_team_matches_rated` that the lookup reads. */
export interface RealDivisionRow {
  opponent_id: string | null;
  season_id: string | null;
  opp_division_id: string | null;
  resolved_by: string | null;
  match_date: string | null;
}

/**
 * True for Hidden and Hidden2. Same rule as both `categorizeDivision` copies:
 * the name holds "hidden" in any case.
 */
export const isHiddenDivisionName = (name: string | null | undefined): boolean =>
  name != null && name.toLowerCase().includes('hidden');

/** The map key every division map uses: one team in one season. */
const divisionKey = (teamId: string, seasonId: string): string => `${teamId}_${seasonId}`;

/** Match time as a number. A missing or unreadable date sorts last. */
const matchTime = (matchDate: string | null): number => {
  const time = matchDate ? Date.parse(matchDate) : Number.NaN;
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
};

interface NameTally {
  count: number;
  earliest: number;
}

/**
 * Turns rows of the Power Score's match view into "teamId_seasonId" -> real
 * division name. `divisionNames` maps a division id to its display name.
 *
 * A row is skipped when it has no opponent or season, no division id, is
 * `unresolved`, names an unknown division, or names a Hidden division. A team
 * keeps ONE name per season: the most frequent answer. On a tie the answer
 * from the earlier match wins (a row with no date counts as latest).
 */
export const pickRealDivisions = (
  rows: readonly RealDivisionRow[],
  divisionNames: ReadonlyMap<string, string>
): Map<string, string> => {
  const tallies = new Map<string, Map<string, NameTally>>();

  for (const row of rows) {
    if (!row.opponent_id || !row.season_id || !row.opp_division_id) continue;
    if (row.resolved_by === 'unresolved') continue;
    const name = divisionNames.get(row.opp_division_id);
    if (!name || isHiddenDivisionName(name)) continue;

    const key = divisionKey(row.opponent_id, row.season_id);
    const byName = tallies.get(key) ?? new Map<string, NameTally>();
    const tally = byName.get(name) ?? { count: 0, earliest: Number.POSITIVE_INFINITY };
    tally.count += 1;
    tally.earliest = Math.min(tally.earliest, matchTime(row.match_date));
    byName.set(name, tally);
    tallies.set(key, byName);
  }

  const picked = new Map<string, string>();
  for (const [key, byName] of tallies) {
    let bestName = '';
    let best: NameTally | null = null;
    for (const [name, tally] of byName) {
      const wins =
        !best ||
        tally.count > best.count ||
        (tally.count === best.count && tally.earliest < best.earliest);
      if (wins) {
        bestName = name;
        best = tally;
      }
    }
    picked.set(key, bestName);
  }
  return picked;
};

/**
 * Returns a copy of a division map with real names filled in. An entry is set
 * ONLY when the current value is missing, blank or Hidden. A real stored name
 * is never replaced, and a Hidden or blank answer is never applied.
 */
export const applyRealDivisions = <V extends string | null>(
  divisions: ReadonlyMap<string, V>,
  overrides: ReadonlyMap<string, string>
): Map<string, V | string> => {
  const result = new Map<string, V | string>(divisions);
  for (const [key, realName] of overrides) {
    if (!realName.trim() || isHiddenDivisionName(realName)) continue;
    const current = result.get(key);
    if (!current?.trim() || isHiddenDivisionName(current)) result.set(key, realName);
  }
  return result;
};
