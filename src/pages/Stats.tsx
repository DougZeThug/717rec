import React from 'react';

import PageLayout from '@/components/layout/PageLayout';
import StatsContainer from '@/components/stats/containers/StatsContainer';
import { useRankingsData } from '@/hooks/rankings/useRankingsData';
import useScrollRestoration from '@/hooks/useScrollRestoration';

const Stats = () => {
  useScrollRestoration('/stats');
  const { latestMatches, matchesLoading, matchesError } = useRankingsData();

  return (
    <PageLayout>
      <StatsContainer
        matches={latestMatches || []}
        isLoadingMatches={matchesLoading}
        matchesError={matchesError}
      />
    </PageLayout>
  );
};

export default Stats;
