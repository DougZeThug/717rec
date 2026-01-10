import React from 'react';

import PageLayout from '@/components/layout/PageLayout';
import TeamsPageContainer from '@/components/teams/TeamsPageContainer';

const TeamsPage: React.FC = () => (
  <PageLayout gradientVariant="blueOrange">
    <TeamsPageContainer />
  </PageLayout>
);

export default TeamsPage;
