import { AnimatePresence, m } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

import { TeamList } from '@/components/teams/TeamList';
import { useScrollBehavior } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/utils';
import { Team } from '@/types';

interface TeamsDivisionSectionProps {
  divisionName: string;
  teams: Team[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
  isLoading: boolean;
  viewMode: 'grid' | 'list';
}

export const TeamsDivisionSection: React.FC<TeamsDivisionSectionProps> = ({
  divisionName,
  teams,
  isExpanded,
  onToggleExpand,
  onEditTeam,
  onDeleteTeam,
  isLoading,
  viewMode,
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const scrollBehavior = useScrollBehavior();
  const contentId = React.useId();
  // Remember the previous state so the scroll below only follows a toggle the
  // visitor made. A division that is already open on first paint (the default
  // one) must leave the page where it is.
  const wasExpanded = useRef(isExpanded);

  // Use double requestAnimationFrame to prevent forced reflow
  useEffect(() => {
    const openedByVisitor = isExpanded && !wasExpanded.current;
    wasExpanded.current = isExpanded;

    if (openedByVisitor && sectionRef.current) {
      const element = sectionRef.current;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const yOffset = -80;
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: scrollBehavior });
        });
      });
    }
  }, [isExpanded, scrollBehavior]);

  if (teams.length === 0) return null;

  return (
    <div className="space-y-2 border-b pb-3 sm:pb-6 last:border-b-0" ref={sectionRef}>
      {/* The whole header is the toggle. The chevron is decoration inside it:
          as its own button it had no accessible name and no handler, so a
          keyboard or screen-reader user could not open a division at all. */}
      <h3 className="font-bebas text-base sm:text-lg uppercase tracking-wide">
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          aria-controls={contentId}
          className={cn(
            'flex w-full justify-between items-center text-left',
            'bg-gray-50/50 dark:bg-gray-900/50 rounded-lg',
            'px-3 py-2 sm:px-4 sm:py-3',
            'hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          <span>
            {divisionName}
            <span className="ml-1.5 text-muted-foreground text-sm font-inter font-normal">
              ({teams.length})
            </span>
          </span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={cn('shrink-0 transition-transform duration-300', isExpanded && 'rotate-180')}
          />
        </button>
      </h3>

      <AnimatePresence>
        {isExpanded && (
          <m.div
            id={contentId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-1 sm:pt-2">
              <TeamList
                teams={teams}
                isLoading={isLoading}
                onEdit={onEditTeam}
                onDelete={onDeleteTeam}
                viewMode={viewMode}
              />
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};
