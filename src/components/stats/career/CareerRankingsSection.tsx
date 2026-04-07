import { ChevronDown, Download, Trophy } from 'lucide-react';
import { useTheme } from 'next-themes';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LoadingState } from '@/components/ui/loading-state';
import { useCareerRankingsWithHidden } from '@/hooks/useCareerRankingsWithHidden';
import { useIsMobile } from '@/hooks/useMobile';
import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { gradients } from '@/styles/design-system';
import { exportCareerStatsToCSV } from '@/utils/exportUtils';

import CareerRankingsTable from './CareerRankingsTable';

const CareerRankingsSection: React.FC = () => {
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();
  const { isWinterTheme } = useSeasonalThemeBase();
  const isLight = !isWinterTheme && resolvedTheme === 'light';
  const { data: careerRankings, isLoading, error } = useCareerRankingsWithHidden();
  const [isOpen, setIsOpen] = React.useState(false);

  if (error) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Career Statistics
          </CardTitle>
          <CardDescription>Error loading career statistics: {error.message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <Card
        className={cn(
          'border-t-2',
          isWinterTheme
            ? 'border-frost-border/50 bg-[hsl(var(--card))]'
            : 'border-blue-300 dark:border-blue-700/80',
          'shadow-lg hover:shadow-xl transition-shadow duration-300',
          isLight ? gradients.card.blueOrange : ''
        )}
      >
        <CollapsibleTrigger asChild>
          <CardHeader
            className={cn(
              isMobile ? 'py-2.5 px-3' : 'py-4',
              isWinterTheme
                ? 'bg-[hsl(var(--card))]'
                : isLight
                  ? 'bg-gradient-to-br from-white via-blue-50/20 to-orange-50/30'
                  : 'bg-gradient-to-br from-gray-800/90 via-gray-800/70 to-gray-900/80',
              isWinterTheme
                ? 'border-b border-frost-border/30'
                : 'border-b border-blue-100 dark:border-blue-900/30',
              'rounded-t-lg cursor-pointer hover:bg-muted/50 transition-colors'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className={cn('text-amber-500', isMobile ? 'h-4 w-4' : 'h-5 w-5')} />
                <div>
                  <CardTitle
                    className={cn(
                      'font-bebas uppercase tracking-wide',
                      isMobile ? 'text-lg' : 'text-xl sm:text-2xl',
                      'bg-gradient-to-br from-blue-800 via-blue-700 to-amber-700 bg-clip-text text-transparent dark:from-blue-400 dark:to-amber-400',
                      'heading-winter'
                    )}
                    style={{ letterSpacing: '0.5px' }}
                  >
                    Career Statistics
                  </CardTitle>
                  {!isMobile && (
                    <CardDescription
                      className={cn(
                        isLight
                          ? '!text-[#444444] !font-medium font-inter'
                          : 'text-gray-400 font-inter'
                      )}
                    >
                      Historical performance across all seasons and playoffs
                    </CardDescription>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isOpen && careerRankings && careerRankings.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportCareerStatsToCSV(careerRankings);
                    }}
                    className={cn(
                      'h-8 px-3 gap-2',
                      isWinterTheme
                        ? 'border-frost-border/50 hover:bg-frost-primary/10'
                        : 'border-muted-foreground/30 hover:bg-muted'
                    )}
                    title="Export to CSV"
                  >
                    <Download className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only">Export</span>
                  </Button>
                )}
                <ChevronDown
                  className={cn('h-5 w-5 transition-transform', isOpen && 'rotate-180')}
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent
            className={cn(
              'p-2 sm:p-4',
              isWinterTheme
                ? 'bg-[hsl(var(--card))]'
                : 'bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800/90 dark:to-gray-900'
            )}
          >
            {isLoading ? (
              <LoadingState variant="section" message="Loading career stats..." />
            ) : careerRankings && careerRankings.length > 0 ? (
              <CareerRankingsTable rankings={careerRankings} />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No career statistics available.
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default CareerRankingsSection;
