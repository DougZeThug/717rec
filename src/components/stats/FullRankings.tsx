import { ChevronDown, Download } from 'lucide-react';
import { useTheme } from 'next-themes';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { gradients } from '@/styles/design-system';
import { Ranking } from '@/types';
import { exportStandingsToCSV } from '@/utils/exportUtils';

import RankingsTable from './RankingsTable';
import ViewToggle from './ViewToggle';

interface FullRankingsProps {
  rankings: Ranking[];
  myTeamId?: string | null;
}

const FullRankings: React.FC<FullRankingsProps> = ({ rankings, myTeamId }) => {
  const [view, setView] = useState<'division' | 'all'>('division');
  const [isOpen, setIsOpen] = useState(true); // Start uncollapsed
  const { resolvedTheme } = useTheme();
  const { isWinterTheme } = useSeasonalTheme();
  const isLight = resolvedTheme === 'light';
  const isMobile = useIsMobile();

  // Sort rankings by power score for the unified view
  const sortedRankings =
    view === 'all' ? [...rankings].sort((a, b) => b.powerScore - a.powerScore) : rankings;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <Card
        className={cn(
          'border-t-2 shadow-lg hover:shadow-xl transition-shadow duration-300',
          isWinterTheme
            ? 'winter-card-surface border-frost-primary/50'
            : 'border-blue-300 dark:border-blue-700/80',
          !isWinterTheme && isLight && gradients.card.blueOrange
        )}
      >
        <CollapsibleTrigger asChild>
          <CardHeader
            className={cn(
              isMobile ? 'py-2.5 px-3' : 'py-4',
              'rounded-t-lg cursor-pointer hover:bg-muted/50 transition-colors',
              isWinterTheme
                ? 'bg-frost-primary/5 border-b border-frost-border/30'
                : isLight
                  ? 'bg-gradient-to-br from-white via-blue-50/20 to-orange-50/30 border-b border-blue-100'
                  : 'bg-gradient-to-br from-gray-800/90 via-gray-800/70 to-gray-900/80 border-b border-blue-900/30'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle
                  className={cn(
                    'font-bebas uppercase tracking-wide',
                    isMobile ? 'text-lg' : 'text-xl sm:text-2xl',
                    isWinterTheme
                      ? 'text-[hsl(var(--foreground))]'
                      : 'bg-gradient-to-br from-blue-800 via-blue-700 to-amber-700 bg-clip-text text-transparent dark:from-blue-400 dark:to-amber-400'
                  )}
                  style={{ letterSpacing: '0.5px' }}
                >
                  Current Standings
                </CardTitle>
                {!isMobile && (
                  <CardDescription
                    className={cn(
                      'line-clamp-2 font-inter',
                      isWinterTheme
                        ? 'text-[hsl(var(--muted-foreground))]'
                        : isLight
                          ? '!text-[#444444] !font-medium'
                          : 'text-gray-400'
                    )}
                  >
                    Based on opponent-weighted win percentage, strength of schedule (SOS), and
                    game-level performance
                  </CardDescription>
                )}
              </div>
              <div className="flex items-center gap-2 ml-auto">
                {isOpen && <ViewToggle view={view} onViewChange={setView} />}
                {isOpen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportStandingsToCSV(sortedRankings);
                    }}
                    className="h-8 px-2"
                    title="Export to CSV"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                <ChevronDown
                  className={cn(
                    'h-5 w-5 transition-transform',
                    isWinterTheme ? 'text-[hsl(var(--muted-foreground))]' : '',
                    isOpen && 'rotate-180'
                  )}
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent
            className={cn(
              isMobile ? 'p-1 pt-0.5' : 'p-2 sm:p-4',
              isWinterTheme
                ? 'bg-transparent'
                : 'bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800/90 dark:to-gray-900'
            )}
          >
            <RankingsTable
              rankings={sortedRankings}
              showUnified={view === 'all'}
              myTeamId={myTeamId}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default FullRankings;
