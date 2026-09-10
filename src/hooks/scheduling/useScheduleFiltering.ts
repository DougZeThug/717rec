import { useMemo } from 'react';

import { useDivisions } from '@/hooks/useDivisions';
import { useTeamMembership } from '@/hooks/useTeamMembership';
import type { Match } from '@/types';
import type { TeamTimeslot } from '@/types/timeslots';
import {
  buildDivisionOptions,
  type DivisionOption,
  filterGroupedTimeslots,
  matchInvolvesTeam,
  matchIsInDivision,
} from '@/utils/schedule/matchFilters';

import type { DivisionFilter, TeamFilter } from './useScheduleUrlState';

interface ScheduleFilteringInput {
  /** The division chip, as its lowercased label, or 'all'. */
  division: DivisionFilter;
  team: TeamFilter;
  /** Already narrowed to the tab on screen. */
  matches: Match[];
  searchTerm: string;
  groupedTimeslots: Record<string, TeamTimeslot[]>;
}

interface ScheduleFiltering {
  /** One chip per display division, for the chip row. */
  divisionOptions: DivisionOption[];
  /** The signed-in member's team, or null when they have none approved. */
  myTeamId: string | null;
  filteredMatches: Match[];
  visibleTimeslots: Record<string, TeamTimeslot[]>;
}

/**
 * Applies the schedule's division chip, "My team" chip and search box.
 *
 * UX audit SC-02. Division is already on every match row through the team
 * join, so neither chip costs an extra fetch — only the division *list* for
 * the chips themselves is fetched, and that is cached for five minutes.
 *
 * Lives outside the page because the page is long enough already, and because
 * the two lists it narrows are rebuilt on every render: keeping the memos here
 * makes it plain that nothing derived from them may feed a state-setting
 * effect.
 */
export const useScheduleFiltering = ({
  division,
  team,
  matches,
  searchTerm,
  groupedTimeslots,
}: ScheduleFilteringInput): ScheduleFiltering => {
  const { divisions } = useDivisions();
  const divisionOptions = useMemo(() => buildDivisionOptions(divisions), [divisions]);
  const selectedDivision = useMemo(
    () => divisionOptions.find((option) => option.value === division) ?? null,
    [divisionOptions, division]
  );

  const { activeMembership } = useTeamMembership();
  // The same rule Standings uses to decide whose row to highlight: an
  // unapproved membership is not yet a team.
  const myTeamId = activeMembership?.is_approved ? (activeMembership.team_id ?? null) : null;
  const myTeamFilterId = team === 'mine' ? myTeamId : null;

  const filteredMatches = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    if (!searchTerm && !selectedDivision && !myTeamFilterId) return matches;

    // One pass, not a chain of filters: these lists are rebuilt on every render
    // and this page is the one scorers keep open.
    return matches.filter((match) => {
      if (selectedDivision && !matchIsInDivision(match, selectedDivision)) return false;
      if (myTeamFilterId && !matchInvolvesTeam(match, myTeamFilterId)) return false;
      if (!searchTerm) return true;

      const team1Name = match.team1Details?.name || '';
      const team2Name = match.team2Details?.name || '';
      return (
        team1Name.toLowerCase().includes(searchLower) ||
        team2Name.toLowerCase().includes(searchLower) ||
        match.location?.toLowerCase().includes(searchLower)
      );
    });
  }, [matches, searchTerm, selectedDivision, myTeamFilterId]);

  // The Timeslots tab is fed by a different query, so it answers the chips here
  // rather than through filteredMatches. Showing the chips on two tabs and
  // ignoring them on the third would be worse than not having them.
  const visibleTimeslots = useMemo(
    () =>
      filterGroupedTimeslots(groupedTimeslots, {
        division: selectedDivision,
        teamId: myTeamFilterId,
      }),
    [groupedTimeslots, selectedDivision, myTeamFilterId]
  );

  return { divisionOptions, myTeamId, filteredMatches, visibleTimeslots };
};
