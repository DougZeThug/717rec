import { Lightbulb } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router';

import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import SeasonBadge from '@/components/ui/season-badge';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';
import { ICON_SIZES, ICON_STROKE } from '@/styles/icon-system';

const StatsPageHeader = () => {
  const navigate = useNavigate();

  return (
    <div className={cn('mt-1', animations.fadeInSlideDown)}>
      <div className="flex justify-center mb-3">
        <SeasonBadge />
      </div>
      <div className="flex justify-between items-start">
        <PageHeader
          title="Standings"
          description="Current season rankings and performance metrics"
          withGradient={true}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/insights')}
          className="shrink-0 mt-1"
        >
          <Lightbulb
            size={ICON_SIZES.md}
            strokeWidth={ICON_STROKE.normal}
            className="mr-1.5 text-yellow-500"
          />
          Insights
        </Button>
      </div>
    </div>
  );
};

export default StatsPageHeader;
