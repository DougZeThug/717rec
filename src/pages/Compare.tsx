import { Scale } from 'lucide-react';
import React from 'react';
import { Helmet } from 'react-helmet-async';

import { CompareOutcome } from '@/components/compare/CompareOutcome';
import { TeamCompareSelector } from '@/components/compare/TeamCompareSelector';
import { ErrorDisplay } from '@/components/ui/error-display';
import { LoadingState } from '@/components/ui/loading-state';
import { useCompareUrlState } from '@/hooks/compare/useCompareUrlState';
import { useTeamsQuery } from '@/hooks/teams';
import { useTeamComparison } from '@/hooks/useTeamComparison';

/**
 * Rendered by every branch below, not just the loaded one: while the teams were
 * loading the page had no h1 at all, so a screen reader arriving on a slow
 * connection was told nothing about where it had landed.
 */
const PAGE_HEADING = (
  <div className="flex items-center justify-center gap-3 mb-6">
    <Scale className="size-7 text-primary" aria-hidden="true" />
    <h1 className="text-2xl sm:text-3xl font-bold">Team Comparison</h1>
  </div>
);

/** Team comparison page: pick two teams (synced to the URL) and view their stats head-to-head. */
const Compare: React.FC = () => {
  const { data: teams, isLoading: teamsLoading, error: teamsError, refetch } = useTeamsQuery();

  // Selection and address are kept in step by the hook, which owns the ordering
  // that makes a shared link survive its first load. See UX audit CP-01.
  const { team1, team2, setTeam1, setTeam2, swapTeams } = useCompareUrlState(teams);

  const comparison = useTeamComparison(team1, team2);

  if (teamsLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {PAGE_HEADING}
        <LoadingState message="Loading teams..." />
      </div>
    );
  }

  if (teamsError) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {PAGE_HEADING}
        <ErrorDisplay
          variant="card"
          error="We couldn't load the teams. Please try again."
          onRetry={refetch}
          className="max-w-md w-full mx-auto"
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
        {PAGE_HEADING}

        {/* Team Selectors */}
        <div className="mb-8">
          <TeamCompareSelector
            teams={teams || []}
            team1={team1}
            team2={team2}
            onTeam1Change={setTeam1}
            onTeam2Change={setTeam2}
            onSwap={swapTeams}
          />
        </div>

        {/* Comparison Content */}
        <CompareOutcome team1={team1} team2={team2} comparison={comparison} />
      </div>
    </>
  );
};

export default Compare;
