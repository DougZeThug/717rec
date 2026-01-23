import { useTheme } from 'next-themes';
import React from 'react';

import AnimatedChartWrapper from '@/components/ui/animated-chart-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';
import { PowerScoreDataItem } from '@/types/chart';

import PowerScoreChart from './PowerScoreChart';

interface PowerScoreChartCardProps {
  data: PowerScoreDataItem[];
}

const PowerScoreChartCard: React.FC<PowerScoreChartCardProps> = ({ data }) => {
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();

  return (
    <AnimatedChartWrapper delay={0.1}>
      <Card
        className={cn(
          'bg-white text-gray-900 border border-gray-200 dark:bg-gray-900 dark:border-0 dark:text-white rounded-xl shadow-sm',
          animations.fadeInSlideUp,
          'animation-delay-200'
        )}
      >
        <CardHeader
          className={isMobile ? 'py-2 px-3' : 'pb-1.5'}
          style={
            resolvedTheme === 'light'
              ? {
                  borderBottom: '1px solid hsl(var(--border))',
                  borderTopLeftRadius: 12,
                  borderTopRightRadius: 12,
                  background: 'hsl(var(--background))',
                }
              : {}
          }
        >
          <CardTitle
            className={cn(
              'font-semibold font-inter tracking-wide text-gray-800 dark:text-white uppercase',
              isMobile ? 'text-base' : 'text-lg'
            )}
            style={{ letterSpacing: '.03em' }}
          >
            Top {isMobile ? '5' : '8'} Power Scores
          </CardTitle>
          {!isMobile && (
            <CardDescription className="text-sm text-gray-600 dark:text-gray-300 font-inter">
              Elite team performance ranking
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className={isMobile ? 'p-2 pt-1' : 'p-4 pt-2'}>
          <PowerScoreChart data={data} />
        </CardContent>
      </Card>
    </AnimatedChartWrapper>
  );
};

export default PowerScoreChartCard;
