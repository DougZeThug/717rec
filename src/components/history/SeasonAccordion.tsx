import { AnimatePresence, m } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import React, { useState } from 'react';

import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';

import SeasonAccordionExpandedContent from './SeasonAccordionExpandedContent';
import SeasonAccordionHeader from './SeasonAccordionHeader';
import SeasonAccordionSummary from './SeasonAccordionSummary';
import { Season } from './seasonAccordionTypes';
import { useSeasonAccordionViewModel } from './useSeasonAccordionViewModel';
import { useSeasonData } from './useSeasonData';

const SeasonAccordion: React.FC<{ season: Season }> = ({ season }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const {
    data: seasonData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useSeasonData(season.id, true);
  const { isWinterTheme } = useSeasonalThemeBase();
  const { isAdminAccessGranted } = useAdminAccess();
  const {
    divisionData,
    teamCount,
    matchCount,
    championTeams,
    hasChampions,
    highlights,
    formatDateRange,
  } = useSeasonAccordionViewModel(season, seasonData);

  return (
    <div
      className={cn(
        'rounded-xl shadow-md overflow-hidden border',
        isWinterTheme
          ? 'frost-card winter-card-surface border-[hsla(199,60%,50%,0.2)]'
          : 'bg-card border-border'
      )}
    >
      <SeasonAccordionHeader
        season={season}
        dateRange={formatDateRange()}
        hasChampions={hasChampions}
        teamCount={teamCount}
        matchCount={matchCount}
        isLoading={isLoading}
        isWinterTheme={isWinterTheme}
      />
      <SeasonAccordionSummary
        isLoading={isLoading}
        seasonData={seasonData}
        championTeams={championTeams}
        highlights={highlights}
        isWinterTheme={isWinterTheme}
      />
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full px-3 py-2 md:px-6 md:py-3 flex items-center justify-center gap-1.5',
          'text-xs font-semibold uppercase tracking-wider transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
          isWinterTheme
            ? 'text-white/60 hover:text-white/80 hover:bg-white/5 border-t border-white/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-t border-border'
        )}
        aria-expanded={isExpanded}
      >
        Full Season Recap
        <ChevronDown
          className={cn('size-3.5 transition-transform duration-200', isExpanded && 'rotate-180')}
        />
      </button>
      <AnimatePresence>
        {isExpanded && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <SeasonAccordionExpandedContent
              isLoading={isLoading}
              error={error as Error | null}
              season={season}
              seasonData={seasonData}
              isEditMode={isEditMode}
              setIsEditMode={setIsEditMode}
              isSaving={isSaving}
              setIsSaving={setIsSaving}
              refetch={refetch}
              isRefetching={isRefetching}
              divisionData={divisionData}
              isAdminAccessGranted={isAdminAccessGranted}
              isWinterTheme={isWinterTheme}
            />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(SeasonAccordion);
