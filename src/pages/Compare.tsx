import { Scale } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router';

import { TeamCompareSelector } from '@/components/compare/TeamCompareSelector';
import { TeamComparisonView } from '@/components/compare/TeamComparisonView';
import { ErrorDisplay } from '@/components/ui/error-display';
import { LoadingState } from '@/components/ui/loading-state';
import { useTeamsQuery } from '@/hooks/teams';
import { useTeamComparison } from '@/hooks/useTeamComparison';
import { Team } from '@/types';

/**
 * Resolve one side's incoming id against the loaded teams, returning the team
 * to select or null when nothing needs to change (no id, same team already
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

/** Team comparison page: pick two teams (synced to the URL) and view their stats head-to-head. */
const Compare: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: teams, isLoading: teamsLoading, error: teamsError, refetch } = useTeamsQuery();

  const [team1, setTeam1] = useState<Team | null>(null);
  const [team2, setTeam2] = useState<Team | null>(null);

  // The teams list arrives after mount, so the incoming ?team1=&team2= cannot be
  // applied on the first render. Until they have been, the URL must be left
  // exactly as it came in: writing the (still empty) selection back would erase
  // the very ids we are waiting to read. See UX audit CP-01.
  const hasAppliedUrlParams = useRef(false);

  // Apply the incoming link once the teams are available. Runs on every
  // searchParams change, not just the first: the address bar can be edited
  // while the page is mounted, and a team named there should still be picked
  // up. The ref only gates the URL *sync* below, so the incoming ids are never
  // overwritten before they have been read.
  useEffect(() => {
    if (!teams || teams.length === 0) return;

    // Teams are loaded, so the link has now had its chance. Mark it applied
    // even when an id matches nothing (a hidden or deleted team), otherwise the
    // URL sync would stay blocked forever.
    hasAppliedUrlParams.current = true;

    const incoming1 = resolveTeamFromParam(teams, searchParams.get('team1'), team1);
    const incoming2 = resolveTeamFromParam(teams, searchParams.get('team2'), team2);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state from incoming props/derived values
    if (incoming1) setTeam1(incoming1);
    if (incoming2) setTeam2(incoming2);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applying the URL to state; team1/team2 deps would fight the user's own edits
  }, [teams, searchParams]);

  // Sync selection to URL
  useEffect(() => {
    if (!hasAppliedUrlParams.current) return;

    const params = new URLSearchParams();
    if (team1) params.set('team1', team1.id);
    if (team2) params.set('team2', team2.id);
    setSearchParams(params, { replace: true });
  }, [team1, team2, setSearchParams]);

  const {
    team1: comparison1,
    team2: comparison2,
    headToHead,
    isLoading: comparisonLoading,
  } = useTeamComparison(team1, team2);

  /** Swap which team is on which side of the comparison. */
  const handleSwap = () => {
    setTeam1(team2);
    setTeam2(team1);
  };

  if (teamsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message="Loading teams..." />
      </div>
    );
  }

  if (teamsError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <ErrorDisplay
          variant="card"
          error="We couldn't load the teams. Please try again."
          onRetry={refetch}
          className="max-w-md w-full"
        />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Team Comparison | 717REC Cornhole League</title>
        <meta
          name="description"
          content="Compare two 717REC cornhole teams side by side with detailed statistics and head-to-head records."
        />
        <link rel="canonical" href="https://717rec.app/compare" />
        <meta property="og:title" content="Team Comparison | 717REC" />
        <meta
          property="og:description"
          content="Compare two 717REC cornhole teams side by side with detailed statistics and head-to-head records."
        />
        <meta property="og:url" content="https://717rec.app/compare" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <Scale className="size-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Team Comparison</h1>
        </div>

        {/* Team Selectors */}
        <div className="mb-8">
          <TeamCompareSelector
            teams={teams || []}
            team1={team1}
            team2={team2}
            onTeam1Change={setTeam1}
            onTeam2Change={setTeam2}
            onSwap={handleSwap}
          />
        </div>

        {/* Comparison Content */}
        {!team1 && !team2 && (
          <div className="text-center py-16">
            <Scale className="size-16 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold mb-2">Select Teams to Compare</h2>
            <p className="text-muted-foreground">
              Choose two teams from the dropdowns above to see a detailed comparison
            </p>
          </div>
        )}

        {(team1 || team2) && (!team1 || !team2) && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              Select {!team1 ? 'the first' : 'the second'} team to start comparing
            </p>
          </div>
        )}

        {team1 && team2 && comparisonLoading && (
          <div className="flex items-center justify-center py-16">
            <LoadingState message="Loading comparison..." />
          </div>
        )}

        {team1 && team2 && comparison1 && comparison2 && !comparisonLoading && (
          <TeamComparisonView team1={comparison1} team2={comparison2} headToHead={headToHead} />
        )}
      </div>
    </>
  );
};

export default Compare;
