import { Grid2x2, List } from 'lucide-react';
import React from 'react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

interface TeamsDisplayModeToggleProps {
  displayMode: 'all' | 'grouped';
  onDisplayModeChange: (mode: 'all' | 'grouped') => void;
}

const TeamsDisplayModeToggle: React.FC<TeamsDisplayModeToggleProps> = ({
  displayMode,
  onDisplayModeChange,
}) => {
  return (
    <ToggleGroup
      type="single"
      value={displayMode}
      onValueChange={(value) => value && onDisplayModeChange(value as 'all' | 'grouped')}
      className="bg-gradient-to-br from-gray-100 to-blue-50/50 dark:from-gray-800/80 dark:to-gray-900 dark:border dark:border-gray-700 p-0.5 rounded-md shadow-sm"
    >
      <ToggleGroupItem
        value="all"
        aria-label="View all teams"
        className={cn(
          'text-xs sm:text-sm transition-all duration-200',
          displayMode === 'all'
            ? 'bg-gradient-to-br from-blue-600 to-amber-600 text-white dark:from-blue-600 dark:to-amber-700 dark:text-white dark:border dark:border-blue-500 toggle-winter-active'
            : 'hover:bg-gradient-to-br hover:from-blue-50 hover:to-orange-50/30 dark:hover:from-gray-700 dark:hover:to-gray-800 dark:text-gray-300 dark:hover:text-white'
        )}
      >
        <List className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
        All Teams
      </ToggleGroupItem>
      <ToggleGroupItem
        value="grouped"
        aria-label="View teams by division"
        className={cn(
          'text-xs sm:text-sm transition-all duration-200',
          displayMode === 'grouped'
            ? 'bg-gradient-to-br from-blue-600 to-amber-600 text-white dark:from-blue-600 dark:to-amber-700 dark:text-white dark:border dark:border-blue-500 toggle-winter-active'
            : 'hover:bg-gradient-to-br hover:from-blue-50 hover:to-orange-50/30 dark:hover:from-gray-700 dark:hover:to-gray-800 dark:text-gray-300 dark:hover:text-white'
        )}
      >
        <Grid2x2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
        By Division
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

export default TeamsDisplayModeToggle;
