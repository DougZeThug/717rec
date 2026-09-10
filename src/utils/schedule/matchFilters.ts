import type { Match } from '@/types';
import type { TeamTimeslot } from '@/types/timeslots';

/**
 * One chip on the schedule's division row.
 *
 * A chip stands for a *display* division ("Competitive"), which the league may
 * run as several real divisions ("Competitive High", "Competitive Low"). Both
 * the ids and the names of those real divisions are collected, because the two
 * things being filtered identify their division differently: a match row
 * carries `division_id`, a timeslot row carries only the division's name.
 *
 * Matching is on values the divisions table gave us, never on a guess from the
 * text. `getDisplayDivision()` exists for bucketing and falls back to
 * "Recreational" for a name it does not know, which would quietly file every
 * unrecognised division under one chip.
 */
export interface DivisionOption {
  /** The value in the address: the label, lowercased. */
  value: string;
  label: string;
  ids: Set<string>;
  /** Lowercased division names, for rows that carry a name and no id. */
  names: Set<string>;
}

interface DivisionRow {
  id: string;
  name: string;
  display_division: string;
  division_weight: number;
}

/** One chip per display division, strongest first, as the divisions list is ordered. */
export const buildDivisionOptions = (divisions: DivisionRow[]): DivisionOption[] => {
  const byLabel = new Map<string, DivisionOption>();

  for (const division of divisions) {
    const label = division.display_division?.trim() || division.name?.trim();
    if (!label) continue;

    const existing = byLabel.get(label);
    const option = existing ?? {
      value: label.toLowerCase(),
      label,
      ids: new Set(),
      names: new Set(),
    };
    if (division.id) option.ids.add(division.id);
    if (division.name) option.names.add(division.name.toLowerCase());
    if (!existing) byLabel.set(label, option);
  }

  return [...byLabel.values()];
};

/**
 * Whether a match belongs on a division's chip.
 *
 * **Either side counts.** Cross-division matches are real — Insights reports
 * Competitive against Intermediate — and a Competitive team's own match must
 * not disappear from the Competitive chip because its opponent is not.
 */
export const matchIsInDivision = (match: Match, option: DivisionOption): boolean =>
  Boolean(
    (match.team1Details?.division_id && option.ids.has(match.team1Details.division_id)) ||
    (match.team2Details?.division_id && option.ids.has(match.team2Details.division_id))
  );

/** Whether a team is playing in this match, on either side. */
export const matchInvolvesTeam = (match: Match, teamId: string): boolean =>
  match.team1Details?.team_id === teamId ||
  match.team2Details?.team_id === teamId ||
  match.team1Id === teamId ||
  match.team2Id === teamId;

/** A timeslot row carries the division's name rather than its id. */
export const timeslotIsInDivision = (row: TeamTimeslot, option: DivisionOption): boolean => {
  const name = row.teams?.divisionName;
  return Boolean(name && option.names.has(name.toLowerCase()));
};

/** Whether a timeslot row belongs to this team. */
export const timeslotInvolvesTeam = (row: TeamTimeslot, teamId: string): boolean =>
  row.team_id === teamId;

/**
 * The same filters over a night's timeslots, dropping any time that empties.
 *
 * Kept beside the match predicates so both tabs answer a chip the same way —
 * showing the chips on one tab and ignoring them on another would be worse than
 * not having them.
 */
export const filterGroupedTimeslots = (
  grouped: Record<string, TeamTimeslot[]>,
  { division, teamId }: { division: DivisionOption | null; teamId: string | null }
): Record<string, TeamTimeslot[]> => {
  if (!division && !teamId) return grouped;

  const filtered: Record<string, TeamTimeslot[]> = {};
  for (const [time, rows] of Object.entries(grouped)) {
    const kept = rows.filter(
      (row) =>
        (!division || timeslotIsInDivision(row, division)) &&
        (!teamId || timeslotInvolvesTeam(row, teamId))
    );
    if (kept.length > 0) filtered[time] = kept;
  }
  return filtered;
};
