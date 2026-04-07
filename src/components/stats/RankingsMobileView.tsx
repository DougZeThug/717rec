import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Bolt, Scale, Search, User } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';

import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { useAllTeamBadges } from '@/hooks/useTeamBadges';
import { cn } from '@/lib/utils';
import { Ranking } from '@/types';
import { TeamBadgeEvent } from '@/types/badges';
import { debugLog } from '@/utils/logger';

import LeagueLeaderboardCarousel from './LeagueLeaderboardCarousel';
import RankingCard from './RankingCard';
import { SortOptions } from './RankingsTable';
import TeamSearchDrawer from './TeamSearchDrawer';
import ViewToggle from './ViewToggle';

interface RankingsMobileViewProps {
  rankings: Ranking[];
  expandedTeam: string | null;
  toggleExpand: (teamId: string) => void;
  sortOptions: SortOptions;
  onSortChange: (field: string) => void;
  showUnified?: boolean;
  myTeamId?: string | null;
  view?: 'division' | 'all';
  onViewChange?: (view: 'division' | 'all') => void;
}

const RankingsMobileView: React.FC<RankingsMobileViewProps> = ({
  rankings,
  expandedTeam,
  toggleExpand,
  sortOptions,
  onSortChange,
  showUnified = false,
  myTeamId,
  view = 'division',
  onViewChange,
}) => {
  const { isWinterTheme } = useSeasonalTheme();
  const { data: allBadges } = useAllTeamBadges();

  const badgesByTeam = useMemo(() => {
    if (!allBadges) return new Map<string, TeamBadgeEvent[]>();
    const map = new Map<string, TeamBadgeEvent[]>();
    for (const badge of allBadges) {
      const existing = map.get(badge.team_id) || [];
      existing.push(badge);
      map.set(badge.team_id, existing);
    }
    return map;
  }, [allBadges]);
  const [detailedView, setDetailedView] = useState(() => {
    const savedView = localStorage.getItem('rankingsDetailedView');
    return savedView ? savedView === 'true' : false;
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedTeamId, setHighlightedTeamId] = useState<string | null>(null);
  const teamRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  const toggleViewMode = (value: string) => {
    if (!value) return;
    const isDetailed = value === 'detailed';
    setDetailedView(isDetailed);
    localStorage.setItem('rankingsDetailedView', String(isDetailed));
  };

  const rankingsByDivision = useMemo(
    () =>
      showUnified
        ? { 'All Teams': rankings }
        : rankings.reduce(
            (acc, ranking) => {
              const displayDivision = ranking.divisionName || 'Unassigned';
              if (!acc[displayDivision]) {
                acc[displayDivision] = [];
              }
              acc[displayDivision].push(ranking);
              return acc;
            },
            {} as Record<string, Ranking[]>
          ),
    [rankings, showUnified]
  );

  const { ref: sectionRef, inView: isSectionVisible } = useInView({ threshold: 0.05 });

  return (
    <div className="font-inter" ref={sectionRef}>
      <LeagueLeaderboardCarousel rankings={rankings} />

      {/* Controls row: ViewToggle + Compact/Detailed toggle */}
      <div className="mb-2 flex items-center justify-between gap-2">
        {onViewChange && <ViewToggle view={view} onViewChange={onViewChange} />}
        <ToggleGroup
          type="single"
          value={detailedView ? 'detailed' : 'compact'}
          onValueChange={toggleViewMode}
          className="border border-border rounded-lg p-0.5"
        >
          <ToggleGroupItem
            value="compact"
            className={cn(
              'text-xs px-2.5 py-1 rounded-md transition-all',
              !detailedView
                ? 'bg-cornhole-navy text-white shadow-sm'
                : 'text-muted-foreground hover:bg-accent'
            )}
          >
            Compact
          </ToggleGroupItem>
          <ToggleGroupItem
            value="detailed"
            className={cn(
              'text-xs px-2.5 py-1 rounded-md transition-all',
              detailedView
                ? 'bg-cornhole-navy text-white shadow-sm'
                : 'text-muted-foreground hover:bg-accent'
            )}
          >
            Detailed
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Sort pills - only visible in detailed view */}
      {detailedView && (
        <div className="mb-2">
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
        </div>
      )}

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
                        prefetchedBadges={badgesByTeam.get(ranking.teamId) || []}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* Find My Team FAB — only visible when standings section is in viewport */}
      {isSectionVisible && (
        <Button
          variant="default"
          size="sm"
          className={cn(
            'fixed bottom-24 right-4 z-50 rounded-full shadow-lg',
            isWinterTheme
              ? 'bg-frost-primary hover:bg-frost-primary/90 text-white'
              : 'bg-primary hover:bg-primary/90'
          )}
          onClick={handleFindMyTeam}
          aria-label={myTeamId ? 'Scroll to my team' : 'Search for a team'}
        >
          {myTeamId ? <User className="h-4 w-4" /> : <Search className="h-4 w-4" />}
        </Button>
      )}

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

export default React.memo(RankingsMobileView);
