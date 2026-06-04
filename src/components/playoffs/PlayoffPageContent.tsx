import { AlertCircle, Loader2, RefreshCw, Trophy } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';

import DivisionBracketsCard from '@/components/playoffs/DivisionBracketsCard';
import EmptyBracketState from '@/components/playoffs/EmptyBracketState';
import { ChallongeFallback } from '@/components/playoffs/embeds/ChallongeFallback';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useChallongeFallbackConfig } from '@/hooks/useChallongeFallback';
import { warnLog } from '@/utils/logger';
import { PlayoffBracket } from '@/utils/playoffs/playoffTypes';

interface PlayoffPageContentProps {
  availableDivisions: string[];
  bracketsByDivision: Record<string, Partial<PlayoffBracket>[]>;
  allBracketsData: Partial<PlayoffBracket>[];
  isLoading: boolean;
  onCreateBracket: () => void;
  onDeleteBracket?: (id: string, name: string) => void;
  onRefreshData?: () => Promise<void>;
  isAdmin?: boolean;
}

const PlayoffPageContent: React.FC<PlayoffPageContentProps> = ({
  availableDivisions,
  bracketsByDivision,
  allBracketsData,
  isLoading,
  onCreateBracket,
  onDeleteBracket: _onDeleteBracket,
  onRefreshData,
  isAdmin = false,
}) => {
  // Enhanced refresh state management
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const lastRefreshTimeRef = React.useRef<Date | null>(null);
  const { data: challongeConfig } = useChallongeFallbackConfig();

  // Enhanced refresh handler with optimistic updates
  const handleRefreshClick = useCallback(async () => {
    if (!onRefreshData || isRefreshing) return;

    setIsRefreshing(true);

    try {
      await onRefreshData();
      lastRefreshTimeRef.current = new Date();
    } catch (error) {
      warnLog('Failed to refresh data:', error);
      // Show user-friendly error without throwing
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefreshData, isRefreshing]);

  // Display loading state
  const displayLoading = isLoading;

  // Memoized division cards for performance - only show divisions with actual brackets
  const divisionsWithBrackets = useMemo(() => {
    return availableDivisions.filter(
      (division) => bracketsByDivision[division] && bracketsByDivision[division].length > 0
    );
  }, [availableDivisions, bracketsByDivision]);

  const divisionCards = useMemo(() => {
    return divisionsWithBrackets.map((division) => (
      <DivisionBracketsCard
        key={division}
        division={division}
        brackets={bracketsByDivision[division] || []}
        onCreateBracket={onCreateBracket}
      />
    ));
  }, [divisionsWithBrackets, bracketsByDivision, onCreateBracket]);

  // Enhanced loading state with refresh capability
  if (displayLoading && !allBracketsData.length && !isRefreshing) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="size-8 text-cornhole-navy animate-spin" />
        <div className="text-center">
          <p className="font-medium">Loading tournament data...</p>
          <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
        </div>
        {onRefreshData && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="flex items-center gap-2 mt-4"
          >
            <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Force Refresh
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {challongeConfig?.enabled && <ChallongeFallback />}

      {/* Refresh Button */}
      {onRefreshData && allBracketsData.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>
      )}

      {/* Empty State - No brackets at all */}
      {!displayLoading &&
        allBracketsData.length === 0 &&
        (isAdmin ? (
          <EmptyBracketState onCreateBracket={onCreateBracket} />
        ) : (
          <div className="text-center py-12 bg-card rounded-lg border">
            <Trophy className="size-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Brackets Available</h3>
            <p className="text-muted-foreground mb-4">
              Brackets will appear here once they are created.
            </p>
          </div>
        ))}

      {/* Division Cards - Show brackets grouped by division */}
      {!displayLoading && divisionsWithBrackets.length > 0 && (
        <div className="space-y-6">{divisionCards}</div>
      )}

      {/* Info message if data loaded but no divisions have brackets */}
      {!displayLoading && allBracketsData.length > 0 && divisionsWithBrackets.length === 0 && (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertDescription>
            Brackets exist but are not assigned to any division. Please assign brackets to divisions
            to see them here.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default React.memo(PlayoffPageContent);
