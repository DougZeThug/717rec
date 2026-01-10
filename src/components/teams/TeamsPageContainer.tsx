import { ChevronDown } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import WinterSection from '@/components/winter/WinterSection';
import { useIsMobile } from '@/hooks/use-mobile';
import useScrollRestoration from '@/hooks/useScrollRestoration';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';

import TeamContainer from './TeamsContainer';
import TeamsHeader from './TeamsHeader';

export type DisplayMode = 'all' | 'grouped';
export type ViewMode = 'grid' | 'list';
export type SortMode = 'rank' | 'alpha';

const TeamsPageContainer: React.FC = () => {
  const isMobile = useIsMobile();

  // Preserve scroll position when navigating back from team details
  useScrollRestoration('/teams');

  // Initialize display and view modes from local storage or default values
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    const savedDisplayMode = localStorage.getItem('teamsDisplayMode');
    if (savedDisplayMode) return savedDisplayMode as DisplayMode;
    return isMobile ? 'grouped' : 'all';
  });

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const savedViewMode = localStorage.getItem('teamsViewMode');
    return (savedViewMode as ViewMode) || 'grid';
  });

  const [sortMode, setSortMode] = useState<SortMode>(() => {
    const savedSortMode = localStorage.getItem('teamsSortMode');
    return (savedSortMode as SortMode) || 'rank';
  });

  // Save to local storage when preferences change
  useEffect(() => {
    localStorage.setItem('teamsDisplayMode', displayMode);
  }, [displayMode]);

  useEffect(() => {
    localStorage.setItem('teamsViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('teamsSortMode', sortMode);
  }, [sortMode]);

  return (
    <WinterSection
      showIcicles
      lightIcicles
      className={cn('space-y-3 sm:space-y-6', animations.fadeIn)}
    >
      <TeamsHeader title="Teams" description="Browse all teams or view by division">
        {/* Mobile: Compact inline controls */}
        <div className="flex sm:hidden items-center gap-1 text-sm mt-1">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground">
              Sort:{' '}
              <span className="text-foreground font-medium">
                {sortMode === 'rank' ? 'Rank' : 'A-Z'}
              </span>
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setSortMode('rank')}>Rank</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortMode('alpha')}>A-Z</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="text-muted-foreground mx-1">·</span>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground">
              View:{' '}
              <span className="text-foreground font-medium">
                {displayMode === 'grouped' ? 'By Division' : 'All'}
              </span>
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setDisplayMode('grouped')}>
                By Division
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDisplayMode('all')}>All Teams</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="text-muted-foreground mx-1">·</span>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground">
              Style:{' '}
              <span className="text-foreground font-medium">
                {viewMode === 'grid' ? 'Grid' : 'List'}
              </span>
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setViewMode('grid')}>Grid</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode('list')}>List</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop: Original toggle buttons */}
        <div className="hidden sm:flex flex-wrap gap-3 mt-2 sm:mt-0">
          <div className="inline-flex rounded-lg bg-muted p-0.5 shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'px-3 py-1 text-sm rounded-md transition-all',
                viewMode === 'grid'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted-foreground/10'
              )}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-3 py-1 text-sm rounded-md transition-all',
                viewMode === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted-foreground/10'
              )}
            >
              List
            </button>
          </div>
          <div className="inline-flex rounded-lg bg-muted p-0.5 shadow-sm">
            <button
              onClick={() => setDisplayMode('all')}
              className={cn(
                'px-3 py-1 text-sm rounded-md transition-all',
                displayMode === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted-foreground/10'
              )}
            >
              All Teams
            </button>
            <button
              onClick={() => setDisplayMode('grouped')}
              className={cn(
                'px-3 py-1 text-sm rounded-md transition-all',
                displayMode === 'grouped'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted-foreground/10'
              )}
            >
              By Division
            </button>
          </div>
        </div>
      </TeamsHeader>

      <TeamContainer displayMode={displayMode} viewMode={viewMode} sortMode={sortMode} />
    </WinterSection>
  );
};

export default TeamsPageContainer;
