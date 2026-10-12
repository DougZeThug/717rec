import React, { useMemo } from 'react';

import PageLayout from '@/components/layout/PageLayout';
import { BASE_URL } from '@/components/seo/seoDefaults';
import SeoHead from '@/components/seo/SeoHead';
import StatsContainer from '@/components/stats/containers/StatsContainer';
import { useRankingsData } from '@/hooks/rankings/useRankingsData';
import { useTeamsQuery } from '@/hooks/teams';
import useScrollRestoration from '@/hooks/useScrollRestoration';
import { useTeamRankings } from '@/hooks/useTeamRankings';
import { buildBreadcrumbJsonLd } from '@/utils/breadcrumbJsonLd';
import { toTeamCanonicalPath } from '@/utils/teamDetailsUtils/teamSeoUtils';

const Stats = () => {
  useScrollRestoration('/stats');
  const { latestMatches, matchesLoading, matchesError, matchesUpdatedAt, matchesFetching } =
    useRankingsData();
  const { rankings } = useTeamRankings();
  // The same team set the team page resolves its own address against, so the
  // address listed here is the one that page declares as canonical.
  const { data: allTeams } = useTeamsQuery({ includeHidden: true });

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
          url: `${BASE_URL}${toTeamCanonicalPath({ id: r.teamId, name: r.teamName }, allTeams)}`,
          name: r.teamName,
        })),
      },
    }),
    [rankings, allTeams]
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
        matchesUpdatedAt={matchesUpdatedAt}
        matchesFetching={matchesFetching}
      />
    </PageLayout>
  );
};

export default Stats;
