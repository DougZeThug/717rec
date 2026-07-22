import React, { useMemo } from 'react';

import PageLayout from '@/components/layout/PageLayout';
import SeoHead from '@/components/seo/SeoHead';
import TeamsPageContainer from '@/components/teams/TeamsPageContainer';
import { useTeamsArray } from '@/hooks/teams';

const TeamsPage: React.FC = () => {
  const { teams } = useTeamsArray();

  const jsonLd = useMemo(
    () => [
      {
        '@context': 'https://schema.org',
        '@type': 'SportsOrganization',
        name: '717REC',
        sport: 'Cornhole',
        url: 'https://717rec.app/teams',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: '717REC teams',
        itemListElement: (teams ?? []).map((t, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          url: `https://717rec.app/teams/${t.id}`,
          name: t.name,
        })),
      },
    ],
    [teams]
  );

  return (
    <PageLayout gradientVariant="blueOrange">
      <SeoHead
        title="Teams | 717REC Cornhole League"
        description="Browse every 717REC team across Competitive, Intermediate, and Recreational divisions with rosters and current records."
        path="/teams"
        jsonLd={jsonLd}
      />
      <TeamsPageContainer />
    </PageLayout>
  );
};

export default TeamsPage;
