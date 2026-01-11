import React from 'react';

import PageHeader from '@/components/layout/PageHeader';
import SeasonBadge from '@/components/ui/season-badge';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';

const StatsPageHeader = () => {
  return (
    <div className={cn('mt-1', animations.fadeInSlideDown)}>
      <div className="flex justify-center mb-3">
        <SeasonBadge />
      </div>
      <PageHeader
        title="Standings"
        description="Current season rankings and performance metrics"
        withGradient={true}
      />
    </div>
  );
};

export default StatsPageHeader;
