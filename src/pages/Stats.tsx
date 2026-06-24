import React from 'react';

import PageLayout from '@/components/layout/PageLayout';
import SeoHead from '@/components/seo/SeoHead';
import StatsContainer from '@/components/stats/containers/StatsContainer';
import { useRankingsData } from '@/hooks/rankings/useRankingsData';
import useScrollRestoration from '@/hooks/useScrollRestoration';

const Stats = () => {
  useScrollRestoration('/stats');
  const { latestMatches, matchesLoading, matchesError } = useRankingsData();

  return (
    <PageLayout>
      <SeoHead
        title="Standings & Rankings | 717REC"
        description="Current 717REC standings, power scores, strength of schedule, and division rankings updated weekly."
        path="/stats"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: '717REC Standings',
          url: 'https://717rec.app/stats',
          about: 'Cornhole league standings and power rankings',
        }}
      />
      <StatsContainer
        matches={latestMatches || []}
        isLoadingMatches={matchesLoading}
        matchesError={matchesError}
      />
    </PageLayout>
  );
};

export default Stats;
