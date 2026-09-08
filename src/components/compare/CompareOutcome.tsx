import { Scale } from 'lucide-react';
import React from 'react';

import { TeamComparisonView } from '@/components/compare/TeamComparisonView';
import { LoadingState } from '@/components/ui/loading-state';
import type { TeamComparisonData } from '@/hooks/useTeamComparison';
import { Team } from '@/types';

interface CompareOutcomeProps {
  team1: Team | null;
  team2: Team | null;
  comparison: TeamComparisonData;
}

/**
 * Whichever of the four states the comparison is in: nothing picked, one team
 * picked, loading, or a finished comparison. They were four independent `&&`
 * chains in the page, each repeating the conditions of the ones before it.
 */
export const CompareOutcome: React.FC<CompareOutcomeProps> = ({ team1, team2, comparison }) => {
  if (!team1 && !team2) {
    return (
      <div className="text-center py-16">
        <Scale className="size-16 mx-auto mb-4 text-muted-foreground/50" aria-hidden="true" />
        <h2 className="text-xl font-semibold mb-2">Select Teams to Compare</h2>
        <p className="text-muted-foreground">
          Choose two teams from the dropdowns above to see a detailed comparison
        </p>
      </div>
    );
  }

  if (!team1 || !team2) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">
          Select {team1 ? 'the second' : 'the first'} team to start comparing
        </p>
      </div>
    );
  }

  if (comparison.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingState message="Loading comparison..." />
      </div>
    );
  }

  if (!comparison.team1 || !comparison.team2) return null;

  return (
    <TeamComparisonView
      team1={comparison.team1}
      team2={comparison.team2}
      headToHead={comparison.headToHead}
    />
  );
};
