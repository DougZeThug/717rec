import { useTheme } from 'next-themes';
import React from 'react';

import AnimatedChartWrapper from '@/components/ui/animated-chart-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartDataItem } from '@/types/chart';

import WinLossChart from './WinLossChart';

interface WinLossChartCardProps {
  data: ChartDataItem[];
  chartLimit: number;
  isMobile: boolean;
}

const WinLossChartCard: React.FC<WinLossChartCardProps> = ({ data, chartLimit, isMobile }) => {
  const { resolvedTheme } = useTheme();

  return (
    <AnimatedChartWrapper delay={0}>
      <Card className="bg-card text-card-foreground border border-border rounded-xl shadow-sm">
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
            className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold font-inter tracking-wide text-foreground uppercase`}
          >
            Win-Loss Records
          </CardTitle>
          {!isMobile && (
            <CardDescription className="text-sm text-muted-foreground font-inter">
              Top {chartLimit} teams by win percentage
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className={isMobile ? 'p-2 pt-1' : 'p-4 pt-2'}>
          <WinLossChart data={data} chartLimit={chartLimit} isMobile={isMobile} />
        </CardContent>
      </Card>
    </AnimatedChartWrapper>
  );
};

export default WinLossChartCard;
