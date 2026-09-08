import { Lightbulb } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router';

import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import SeasonBadge from '@/components/ui/season-badge';
import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';
import { ICON_SIZES, ICON_STROKE } from '@/styles/icon-system';

const StatsPageHeader = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <div className={cn('mt-1', animations.fadeInSlideDown)}>
      {/* The visible title below is desktop-only, so a phone had no h1 at all
          and a screen reader landed on the page with nothing naming it. */}
      {isMobile && <h1 className="sr-only">Standings</h1>}
      <div className="flex items-center justify-between mb-3">
        <SeasonBadge />
        {isMobile && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/insights')}
            className="shrink-0"
          >
            <Lightbulb
              size={ICON_SIZES.md}
              strokeWidth={ICON_STROKE.normal}
              className="mr-1.5 text-yellow-500"
            />
            Insights
          </Button>
        )}
      </div>
      {!isMobile && (
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
      )}
    </div>
  );
};

export default StatsPageHeader;
