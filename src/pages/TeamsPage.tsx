import React from 'react';

import PageLayout from '@/components/layout/PageLayout';
import SeoHead from '@/components/seo/SeoHead';
import TeamsPageContainer from '@/components/teams/TeamsPageContainer';

const TeamsPage: React.FC = () => (
  <PageLayout gradientVariant="blueOrange">
    <SeoHead
      title="Teams | 717REC Cornhole League"
      description="Browse every 717REC team across Competitive, Intermediate, and Recreational divisions with rosters and current records."
      path="/teams"
      jsonLd={{
        '@context': 'https://schema.org',
        '@type': 'SportsOrganization',
        name: '717REC',
        sport: 'Cornhole',
        url: 'https://717rec.app/teams',
      }}
    />
    <TeamsPageContainer />
  </PageLayout>
);

export default TeamsPage;
