import React from 'react';

import LeagueInsightsContainer from '@/components/insights/LeagueInsightsContainer';
import PageLayout from '@/components/layout/PageLayout';
import useScrollRestoration from '@/hooks/useScrollRestoration';

const Insights = () => {
  useScrollRestoration('/insights');

  return (
    <PageLayout>
      <LeagueInsightsContainer />
    </PageLayout>
  );
};

export default Insights;
