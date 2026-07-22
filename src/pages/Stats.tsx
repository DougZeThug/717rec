import React, { useMemo } from 'react';

import PageLayout from '@/components/layout/PageLayout';
import SeoHead from '@/components/seo/SeoHead';
import StatsContainer from '@/components/stats/containers/StatsContainer';
import { useRankingsData } from '@/hooks/rankings/useRankingsData';
import useScrollRestoration from '@/hooks/useScrollRestoration';
import { useTeamRankings } from '@/hooks/useTeamRankings';
import { buildBreadcrumbJsonLd } from '@/utils/breadcrumbJsonLd';

const Stats = () => {
  useScrollRestoration('/stats');
  const { latestMatches, matchesLoading, matchesError } = useRankingsData();
  const { rankings } = useTeamRankings();

  const standingsJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: '717REC Standings',
      url: 'https://717rec.app/stats',
      about: 'Cornhole league standings and power rankings',
      mainEntity: {
        '@type': 'ItemList',
        name: '717REC power rankings',
        itemListElement: (rankings ?? []).slice(0, 20).map((r, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          url: `https://717rec.app/teams/${r.teamId}`,
          name: r.teamName,
        })),
      },
    }),
    [rankings]
  );

  const breadcrumbJsonLd = useMemo(
    () =>
      buildBreadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Standings', path: '/stats' },
      ]),
    []
  );

  return (
    <PageLayout>
      <SeoHead
        title="Standings & Rankings | 717REC"
        description="Current 717REC standings, power scores, strength of schedule, and division rankings updated weekly."
        path="/stats"
        jsonLd={[standingsJsonLd, breadcrumbJsonLd]}
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
