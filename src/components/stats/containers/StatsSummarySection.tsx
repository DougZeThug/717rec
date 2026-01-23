import { ArrowDown, ChevronDown } from 'lucide-react';
import { useTheme } from 'next-themes';
import React from 'react';

import CompactStandings from '@/components/stats/CompactStandings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/useMobile';
import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { gradients } from '@/styles/design-system';
import { Ranking } from '@/types';

interface StatsSummarySectionProps {
  rankings: Ranking[];
  scrollToFullRankings: () => void;
}

const StatsSummarySection = ({ rankings, scrollToFullRankings }: StatsSummarySectionProps) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();
  const { isWinterTheme } = useSeasonalThemeBase();
  const isLight = !isWinterTheme && resolvedTheme === 'light';

  const compactLimit = isMobile ? 5 : 5;

  // Check if all teams have 0-0 records (new season starting)
  const isNewSeason =
    rankings.length > 0 && rankings.every((team) => team.wins === 0 && team.losses === 0);

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
                  Current Standings
                </CardTitle>
                {!isMobile && (
                  <CardDescription
                    className={cn(
                      isLight ? 'text-gray-600 font-medium font-inter' : 'text-gray-400 font-inter'
                    )}
                  >
                    Top {compactLimit} teams based on performance
                  </CardDescription>
                )}
              </div>
              <ChevronDown className={cn('h-5 w-5 transition-transform', isOpen && 'rotate-180')} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent
            className={cn(
              isMobile ? 'p-3' : 'p-4',
              isWinterTheme
                ? 'bg-[hsl(var(--card))]'
                : 'bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800/90 dark:to-gray-900'
            )}
          >
            {isNewSeason && (
              <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
                <p className="text-sm text-blue-700 dark:text-blue-300 font-inter text-center">
                  🏆 New season starting — standings will update once matches are played
                </p>
              </div>
            )}
            <CompactStandings rankings={rankings.slice(0, compactLimit)} />
            <div className="mt-4 text-center">
              <Button
                onClick={scrollToFullRankings}
                variant="blueOrange"
                className="flex items-center gap-2 rounded-lg px-4 py-2 font-inter font-medium shadow-sm"
              >
                View Full Standings
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default StatsSummarySection;
