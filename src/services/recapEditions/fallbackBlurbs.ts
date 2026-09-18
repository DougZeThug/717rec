import type { RecapTeamGrade } from '@/types/recapEdition';
import { formatOrdinal } from '@/utils/percentileUtils';

/**
 * A line about each team, built from the frozen facts alone.
 *
 * Written first, and kept, so the content pack never depends on the caption
 * service being configured or reachable. When the AI blurbs are generated they
 * replace these; when they are not, these are what gets published.
 *
 * Every clause here is a restatement of a number already in the facts. Nothing
 * describes a throw, a comeback or a clutch shot: the league does not record
 * them, so there is nothing to restate.
 */

/** Places gained since last week. Positive is a climb. Null when incomparable. */
const placesMoved = (team: RecapTeamGrade): number | null =>
  team.previousRank === null ? null : team.previousRank - team.rank;

/** Movement worth naming. One place either way is noise in a 26-team league. */
const NOTABLE_MOVE = 2;

/** Power movement inside this band reads as flat rather than "+0.0". */
const FLAT_BAND = 0.05;

const movementClause = (team: RecapTeamGrade): string => {
  const moved = placesMoved(team);
  const place = formatOrdinal(team.rank);

  if (moved === null) return `Sits ${place}`;
  if (moved > 0) return `Up ${moved} to ${place}`;
  if (moved < 0) return `Down ${Math.abs(moved)} to ${place}`;
  return `Holds ${place}`;
};

const recordClause = (team: RecapTeamGrade): string | null => {
  if (team.wins + team.losses === 0) return null;
  return `${team.wins}-${team.losses} on the season`;
};

const powerClause = (team: RecapTeamGrade): string | null => {
  if (team.delta === null || Math.abs(team.delta) < FLAT_BAND) return null;
  const sign = team.delta > 0 ? '+' : '';
  return `${sign}${team.delta.toFixed(1)} power`;
};

/**
 * The one team that climbed furthest, and the one that fell furthest.
 *
 * Awarded only when a single team holds the record and the move is worth
 * naming — a three-way tie for "biggest climb" makes the phrase a lie for two
 * of them — and only when there is something to compare against. "The week's
 * biggest climb" said of the only team that could be measured is a restatement
 * dressed up as a comparison.
 */
const findSuperlatives = (
  teams: RecapTeamGrade[]
): { climberId: string | null; fallerId: string | null } => {
  const moves = teams
    .map((team) => ({ teamId: team.teamId, moved: placesMoved(team) }))
    .filter((m): m is { teamId: string; moved: number } => m.moved !== null);

  // Fewer than two comparable teams and there is no "biggest" to speak of.
  if (moves.length < 2) return { climberId: null, fallerId: null };

  const soleHolder = (best: number): string | null => {
    const holders = moves.filter((m) => m.moved === best);
    return holders.length === 1 ? holders[0].teamId : null;
  };

  const climbs = moves.filter((m) => m.moved >= NOTABLE_MOVE).map((m) => m.moved);
  const falls = moves.filter((m) => m.moved <= -NOTABLE_MOVE).map((m) => m.moved);

  return {
    climberId: climbs.length > 0 ? soleHolder(Math.max(...climbs)) : null,
    fallerId: falls.length > 0 ? soleHolder(Math.min(...falls)) : null,
  };
};

/** One line per team, keyed by team id, ready to drop into a version's blurbs. */
export const buildFallbackBlurbs = (teams: RecapTeamGrade[]): Record<string, string> => {
  const { climberId, fallerId } = findSuperlatives(teams);
  const blurbs: Record<string, string> = {};

  for (const team of teams) {
    const parts = [movementClause(team), recordClause(team), powerClause(team)].filter(
      (part): part is string => part !== null
    );

    let line = `${parts.join(', ')}.`;

    if (team.teamId === climberId) line += " The week's biggest climb.";
    else if (team.teamId === fallerId) line += " The week's steepest fall.";

    blurbs[team.teamId] = line;
  }

  return blurbs;
};
