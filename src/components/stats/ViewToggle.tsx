import { Grid2x2, List } from 'lucide-react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';

interface ViewToggleProps {
  view: 'division' | 'all';
  onViewChange: (view: 'division' | 'all') => void;
}

const ViewToggle = ({ view, onViewChange }: ViewToggleProps) => {
  const { isWinterTheme } = useSeasonalTheme();

  return (
    <ToggleGroup
      type="single"
      value={view}
      onValueChange={(value) => value && onViewChange(value as 'division' | 'all')}
      className={cn(
        'border-2 p-1 rounded-lg shadow-md',
        isWinterTheme
          ? 'bg-[hsl(var(--secondary))] border-frost-border/40'
          : 'bg-white dark:bg-gray-800 border-blue-300 dark:border-blue-600'
      )}
    >
      <ToggleGroupItem
        value="division"
        aria-label="View by Division"
        className={cn(
          'transition-all duration-200 px-3 py-1.5 text-sm font-medium rounded-md',
          view === 'division'
            ? isWinterTheme
              ? 'btn-winter-primary'
              : 'bg-gradient-to-br from-blue-600 to-amber-600 text-white shadow-sm'
            : isWinterTheme
              ? 'text-[hsl(var(--muted-foreground))] hover:bg-frost-primary/10'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        )}
      >
        <Grid2x2 className="h-4 w-4 mr-1.5" />
        Division
      </ToggleGroupItem>
      <ToggleGroupItem
        value="all"
        aria-label="View All Teams"
        className={cn(
          'transition-all duration-200 px-3 py-1.5 text-sm font-medium rounded-md',
          view === 'all'
            ? isWinterTheme
              ? 'btn-winter-primary'
              : 'bg-gradient-to-br from-blue-600 to-amber-600 text-white shadow-sm'
            : isWinterTheme
              ? 'text-[hsl(var(--muted-foreground))] hover:bg-frost-primary/10'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        )}
      >
        <List className="h-4 w-4 mr-1.5" />
        All
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

export default ViewToggle;
