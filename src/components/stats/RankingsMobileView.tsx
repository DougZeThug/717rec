import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Bolt, Scale, Search, User } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { gradients } from '@/styles/design-system';
import { Ranking } from '@/types';
import { debugLog } from '@/utils/logger';

import RankingCard from './RankingCard';
import { SortOptions } from './RankingsTable';
import TeamSearchDrawer from './TeamSearchDrawer';

interface RankingsMobileViewProps {
  rankings: Ranking[];
  expandedTeam: string | null;
  toggleExpand: (teamId: string) => void;
  sortOptions: SortOptions;
  onSortChange: (field: string) => void;
  showUnified?: boolean;
  myTeamId?: string | null;
}

const RankingsMobileView: React.FC<RankingsMobileViewProps> = ({
  rankings,
  expandedTeam,
  toggleExpand,
  sortOptions,
  onSortChange,
  showUnified = false,
  myTeamId,
}) => {
  const { isWinterTheme } = useSeasonalTheme();
  const [detailedView, setDetailedView] = useState(() => {
    const savedView = localStorage.getItem('rankingsDetailedView');
    return savedView ? savedView === 'true' : false;
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedTeamId, setHighlightedTeamId] = useState<string | null>(null);
  const teamRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Enhanced logging to debug ranking data
  useEffect(() => {
    debugLog(
      'Mobile rankings data with trends:',
      rankings.map((r) => ({
        team: r.teamName,
        rank: rankings.findIndex((sr) => sr.teamId === r.teamId) + 1,
        rankChange: r.rankChange,
        previousRank: r.previousRank,
      }))
    );

    // Log any teams with actual rank changes
    const teamsWithChanges = rankings.filter(
      (r) => r.rankChange !== 0 && r.rankChange !== undefined
    );
    if (teamsWithChanges.length > 0) {
      debugLog(
        'Teams with non-zero rank changes:',
        teamsWithChanges.map((r) => ({
          team: r.teamName,
          rankChange: r.rankChange,
        }))
      );
    }
  }, [rankings]);

  const scrollToTeam = useCallback((teamId: string) => {
    const element = teamRefs.current.get(teamId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedTeamId(teamId);
      // Clear highlight after animation
      setTimeout(() => setHighlightedTeamId(null), 2000);
    }
  }, []);

  const handleFindMyTeam = useCallback(() => {
    if (myTeamId) {
      scrollToTeam(myTeamId);
    } else {
      setSearchOpen(true);
    }
  }, [myTeamId, scrollToTeam]);

  const handleTeamSelect = useCallback(
    (teamId: string) => {
      setSearchOpen(false);
      // Small delay to let drawer close animation start
      setTimeout(() => scrollToTeam(teamId), 150);
    },
    [scrollToTeam]
  );

  const sortableFields = [
    {
      id: 'powerScore',
      label: (
        <>
          <Bolt size={16} className="inline-block mr-1" />
          Power
        </>
      ),
    },
    { id: 'winPercentage', label: 'Win %' },
    {
      id: 'sos',
      label: (
        <>
          <Scale size={15} className="inline-block mr-1" />
          SOS
        </>
      ),
    },
    { id: 'wins', label: 'Wins' },
  ];

  const toggleViewMode = (checked: boolean) => {
    setDetailedView(checked);
    localStorage.setItem('rankingsDetailedView', String(checked));
  };

  // Group by display divisions using divisionName which now contains display_division
  const rankingsByDivision = showUnified
    ? { 'All Teams': rankings }
    : rankings.reduce(
        (acc, ranking) => {
          // Use divisionName which now contains the display_division value
          const displayDivision = ranking.divisionName || 'Unassigned';
          if (!acc[displayDivision]) {
            acc[displayDivision] = [];
          }
          acc[displayDivision].push(ranking);
          return acc;
        },
        {} as Record<string, Ranking[]>
      );

  return (
    <div className="font-inter">
      <div className="mb-2 space-y-1">
        <div className="flex flex-col gap-1">
          <div className="overflow-x-auto pb-1.5 touch-pan-x -mx-1 px-1">
            <div className="flex space-x-2">
              {sortableFields.map((field) => (
                <Button
                  key={field.id}
                  variant={sortOptions.field === field.id ? 'blueOrange' : 'outline'}
                  size="sm"
                  onClick={() => onSortChange(field.id)}
                  className={cn(
                    'rounded-lg py-2 px-3 text-xs font-medium transition-all whitespace-nowrap min-h-[36px]',
                    isWinterTheme &&
                      (sortOptions.field === field.id
                        ? 'btn-winter-primary'
                        : 'btn-winter-secondary'),
                    !isWinterTheme &&
                      sortOptions.field !== field.id &&
                      'bg-card hover:bg-accent/50 text-foreground border-border'
                  )}
                >
                  {field.label}
                  {sortOptions.field === field.id &&
                    (sortOptions.direction === 'asc' ? (
                      <ArrowUp className="ml-1 h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 h-3 w-3" />
                    ))}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="detailed-view" checked={detailedView} onCheckedChange={toggleViewMode} />
            <Label
              htmlFor="detailed-view"
              className={cn(
                'text-sm',
                isWinterTheme ? 'text-[hsl(var(--muted-foreground))]' : 'text-muted-foreground'
              )}
              onClick={() => toggleViewMode(!detailedView)}
            >
              {detailedView ? 'Detailed View' : 'Compact View'}
            </Label>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {Object.entries(rankingsByDivision).map(([displayDivision, divisionRankings]) => (
          <div key={displayDivision} className="space-y-1">
            {!showUnified && (
              <h3
                className={cn(
                  'text-lg font-medium flex items-center font-inter',
                  isWinterTheme
                    ? 'text-[hsl(var(--foreground))] border-l-4 border-[hsl(var(--frost-border))] pl-2 bg-white/5'
                    : 'text-foreground border-l-4 border-blue-500 dark:border-blue-700 pl-2 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent'
                )}
              >
                {displayDivision}{' '}
                <span className="ml-2 text-xs text-muted-foreground font-inter">
                  ({divisionRankings.length})
                </span>
              </h3>
            )}
            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {divisionRankings.map((ranking, idx) => {
                  const globalIndex = rankings.findIndex((r) => r.teamId === ranking.teamId);
                  return (
                    <motion.div
                      key={ranking.teamId}
                      ref={(el) => {
                        if (el) teamRefs.current.set(ranking.teamId, el);
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{
                        duration: 0.2,
                        delay: idx * 0.03,
                        type: 'spring',
                        stiffness: 500,
                        damping: 30,
                      }}
                      layout
                      className={cn(
                        'transition-all duration-300',
                        highlightedTeamId === ranking.teamId &&
                          'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg animate-pulse'
                      )}
                    >
                      <RankingCard
                        ranking={ranking}
                        index={globalIndex}
                        expandedTeam={expandedTeam}
                        onToggleExpand={toggleExpand}
                        compactView={!detailedView}
                        showDivision={showUnified}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* Find My Team FAB */}
      <Button
        variant="default"
        size="sm"
        className={cn(
          'fixed bottom-20 right-4 z-30 rounded-full shadow-lg px-4',
          isWinterTheme
            ? 'bg-frost-primary hover:bg-frost-primary/90 text-white'
            : 'bg-primary hover:bg-primary/90'
        )}
        onClick={handleFindMyTeam}
      >
        {myTeamId ? (
          <>
            <User className="h-4 w-4 mr-2" />
            My Team
          </>
        ) : (
          <>
            <Search className="h-4 w-4 mr-2" />
            Find Team
          </>
        )}
      </Button>

      {/* Team Search Drawer */}
      <TeamSearchDrawer
        open={searchOpen}
        onOpenChange={setSearchOpen}
        rankings={rankings}
        onTeamSelect={handleTeamSelect}
      />
    </div>
  );
};

export default RankingsMobileView;
