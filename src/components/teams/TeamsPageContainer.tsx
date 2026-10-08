import { ChevronDown } from 'lucide-react';
import React, { useMemo } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToggleButtonGroup, ToggleOption } from '@/components/ui/ToggleButtonGroup';
import WinterSection from '@/components/winter/WinterSection';
import { useIsMobile } from '@/hooks/useMobile';
import useScrollRestoration from '@/hooks/useScrollRestoration';
import { DisplayMode, useTeamsPreferences, ViewMode } from '@/hooks/useTeamsPreferences';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';

import TeamContainer from './TeamsContainer';
import TeamsHeader from './TeamsHeader';

interface CompactDropdownProps {
  label: string;
  valueLabel: string;
  items: { label: string; onSelect: () => void }[];
}

// Inline "Label: value" menu used by the mobile controls
const CompactDropdown: React.FC<CompactDropdownProps> = ({ label, valueLabel, items }) => (
  <DropdownMenu>
    <DropdownMenuTrigger className="flex min-h-11 items-center gap-0.5 text-muted-foreground hover:text-foreground">
      {label}: <span className="text-foreground font-medium">{valueLabel}</span>
      <ChevronDown className="size-3" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      {items.map((item) => (
        <DropdownMenuItem key={item.label} onClick={item.onSelect}>
          {item.label}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

const TeamsPageContainer: React.FC = () => {
  const isMobile = useIsMobile();

  // Preserve scroll position when navigating back from team details
  useScrollRestoration('/teams');

  // Manage display preferences with localStorage persistence
  const { displayMode, setDisplayMode, viewMode, setViewMode, sortMode, setSortMode } =
    useTeamsPreferences({
      defaultDisplayMode: isMobile ? 'grouped' : 'all',
      defaultViewMode: 'grid',
      defaultSortMode: 'rank',
    });

  const viewModeOptions: ToggleOption<ViewMode>[] = useMemo(
    () => [
      { value: 'grid', label: 'Grid' },
      { value: 'list', label: 'List' },
    ],
    []
  );

  const displayModeOptions: ToggleOption<DisplayMode>[] = useMemo(
    () => [
      { value: 'all', label: 'All Teams' },
      { value: 'grouped', label: 'By Division' },
    ],
    []
  );

  return (
    <WinterSection
      showIcicles
      lightIcicles
      className={cn('space-y-3 sm:space-y-6', animations.fadeIn)}
    >
      <TeamsHeader title="Teams" description="Browse all teams or view by division">
        {/* Mobile: Compact inline controls */}
        <div className="flex sm:hidden flex-wrap items-center gap-x-1 text-sm w-full">
          <CompactDropdown
            label="Sort"
            valueLabel={sortMode === 'rank' ? 'Rank' : 'A-Z'}
            items={[
              { label: 'Rank', onSelect: () => setSortMode('rank') },
              { label: 'A-Z', onSelect: () => setSortMode('alpha') },
            ]}
          />
          <span className="text-muted-foreground mx-1">·</span>
          <CompactDropdown
            label="View"
            valueLabel={displayMode === 'grouped' ? 'By Division' : 'All'}
            items={[
              { label: 'By Division', onSelect: () => setDisplayMode('grouped') },
              { label: 'All Teams', onSelect: () => setDisplayMode('all') },
            ]}
          />
          <span className="text-muted-foreground mx-1">·</span>
          <CompactDropdown
            label="Style"
            valueLabel={viewMode === 'grid' ? 'Grid' : 'List'}
            items={[
              { label: 'Grid', onSelect: () => setViewMode('grid') },
              { label: 'List', onSelect: () => setViewMode('list') },
            ]}
          />
        </div>

        {/* Desktop: Toggle buttons */}
        <div className="hidden sm:flex flex-wrap gap-3 mt-2 sm:mt-0">
          <ToggleButtonGroup
            options={viewModeOptions}
            value={viewMode}
            onChange={(value) => setViewMode(value)}
            variant="segmented"
          />
          <ToggleButtonGroup
            options={displayModeOptions}
            value={displayMode}
            onChange={(value) => setDisplayMode(value)}
            variant="segmented"
          />
        </div>
      </TeamsHeader>

      <TeamContainer displayMode={displayMode} viewMode={viewMode} sortMode={sortMode} />
    </WinterSection>
  );
};

export default TeamsPageContainer;
