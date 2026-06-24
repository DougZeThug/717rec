import React from 'react';

import LeagueInsightsContainer from '@/components/insights/LeagueInsightsContainer';
import PageLayout from '@/components/layout/PageLayout';
import SeoHead from '@/components/seo/SeoHead';
import useScrollRestoration from '@/hooks/useScrollRestoration';

const Insights = () => {
  useScrollRestoration('/insights');

  return (
    <PageLayout>
      <SeoHead
        title="League Insights | 717REC"
        description="717REC league-wide cornhole insights: division strength, parity, top performers, and trends."
        path="/insights"
      />
      <LeagueInsightsContainer />
    </PageLayout>
  );
};

export default Insights;
