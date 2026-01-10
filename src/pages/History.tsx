import React from 'react';

import HistoryPageContent from '@/components/history/HistoryPageContent';
import PageHeader from '@/components/layout/PageHeader';
import PageLayout from '@/components/layout/PageLayout';
import AnimatedBreadcrumbs from '@/components/navigation/AnimatedBreadcrumbs';
import PageTransition from '@/components/transitions/PageTransition';
import { useIsMobile } from '@/hooks/use-mobile';
import useScrollRestoration from '@/hooks/useScrollRestoration';

const History: React.FC = () => {
  useScrollRestoration('/history');
  const isMobile = useIsMobile();

  return (
    <PageLayout
      className="flex flex-col gap-4 md:gap-8"
      compact={isMobile}
      gradientVariant="blueOrange"
    >
      <PageTransition animation="fadeInSlideDown">
        <div className="container mx-auto px-4">
          <AnimatedBreadcrumbs className="mb-2" />
        </div>
        <PageHeader
          title="Season History"
          description="Explore past seasons, champions, and standings"
        />
      </PageTransition>

      <div className="container mx-auto px-4">
        <PageTransition animation="fadeInSlideUp" delay="short">
          <HistoryPageContent />
        </PageTransition>
      </div>
    </PageLayout>
  );
};

export default History;
