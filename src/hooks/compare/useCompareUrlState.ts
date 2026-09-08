import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import type { Team } from '@/types';

/**
 * Resolve one side's incoming id against the loaded teams, returning the team
 * to select or null when nothing needs to change (no id, the same team already
 * chosen, or an id that matches no visible team).
 */
const resolveTeamFromParam = (
  teams: Team[],
  paramId: string | null,
  current: Team | null
): Team | null => {
  if (!paramId || paramId === current?.id) return null;
  return teams.find((team) => team.id === paramId) ?? null;
};

interface CompareUrlState {
  team1: Team | null;
  team2: Team | null;
  setTeam1: (team: Team | null) => void;
  setTeam2: (team: Team | null) => void;
  swapTeams: () => void;
}

/**
 * Keeps the two compared teams and the address in step.
 *
 * The teams list arrives after mount, so an incoming `?team1=&team2=` cannot be
 * applied on the first render. Until it has been, the address is left exactly as
 * it came in: writing the still-empty selection back would erase the very ids
 * the page is waiting to read, which is what made shared links open blank.
 * See UX audit CP-01.
 */
export const useCompareUrlState = (teams: Team[] | undefined): CompareUrlState => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [team1, setTeam1] = useState<Team | null>(null);
  const [team2, setTeam2] = useState<Team | null>(null);
  const hasAppliedUrlParams = useRef(false);

  // Apply the incoming link once the teams are available. This runs on every
  // searchParams change, not only the first, so editing the address bar while
  // the page is open is still picked up.
  useEffect(() => {
    if (!teams || teams.length === 0) return;

    // The link has now had its chance. Mark it applied even when an id matches
    // nothing (a hidden or deleted team), or the sync below stays blocked.
    hasAppliedUrlParams.current = true;

    const incoming1 = resolveTeamFromParam(teams, searchParams.get('team1'), team1);
    const incoming2 = resolveTeamFromParam(teams, searchParams.get('team2'), team2);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state from incoming props/derived values
    if (incoming1) setTeam1(incoming1);
    if (incoming2) setTeam2(incoming2);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applying the URL to state; team1/team2 deps would fight the user's own edits
  }, [teams, searchParams]);

  // Sync the selection back to the address, once the link has been read.
  useEffect(() => {
    if (!hasAppliedUrlParams.current) return;

    const params = new URLSearchParams();
    if (team1) params.set('team1', team1.id);
    if (team2) params.set('team2', team2.id);
    setSearchParams(params, { replace: true });
  }, [team1, team2, setSearchParams]);

  const swapTeams = () => {
    setTeam1(team2);
    setTeam2(team1);
  };

  return { team1, team2, setTeam1, setTeam2, swapTeams };
};
