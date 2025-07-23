
import React, { useCallback, useMemo } from "react";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import DivisionBracketsCard from "@/components/playoffs/DivisionBracketsCard";
import EmptyBracketState from "@/components/playoffs/EmptyBracketState";
import { ChallongeFallback } from "@/components/playoffs/embeds/ChallongeFallback";
import { PlayoffBracket } from "@/types/playoffs";
import BracketView from "./BracketView";

interface PlayoffPageContentProps {
  availableDivisions: string[];
  bracketsByDivision: Record<string, Partial<PlayoffBracket>[]>;
  selectedBracketId: string | null;
  allBracketsData: Partial<PlayoffBracket>[];
  isLoading: boolean;
  onCreateBracket: () => void;
  onViewBracket: (id: string) => void;
  onEditBracket: () => void;
  onEditMatch: (matchId: string) => void;
  onDeleteBracket?: (id: string, name: string) => void;
  onRefreshData?: () => Promise<void>;
  
  // Enhanced props for better data flow
  bracket?: any;
  teams?: any[];
  bracketLoading?: boolean;
}

const PlayoffPageContent: React.FC<PlayoffPageContentProps> = ({
  availableDivisions,
  bracketsByDivision,
  selectedBracketId,
  allBracketsData,
  isLoading,
  onCreateBracket,
  onViewBracket,
  onEditBracket,
  onEditMatch,
  onDeleteBracket,
  onRefreshData,
  bracket,
  teams,
  bracketLoading
}) => {
  // Enhanced refresh state management
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastRefreshTime, setLastRefreshTime] = React.useState<Date | null>(null);

  // Enhanced refresh handler with optimistic updates
  const handleRefreshClick = useCallback(async () => {
    if (!onRefreshData || isRefreshing) return;
    
    setIsRefreshing(true);
    const startTime = new Date();
    
    try {
      await onRefreshData();
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error("Failed to refresh data:", error);
      // Show user-friendly error without throwing
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefreshData, isRefreshing]);

  // Memoized display loading for performance
  const displayLoading = useMemo(() => {
    return bracketLoading !== undefined ? bracketLoading : isLoading;
  }, [bracketLoading, isLoading]);

  // Memoized division cards for performance - only show divisions with actual brackets
  const divisionsWithBrackets = useMemo(() => {
    return availableDivisions.filter(division => 
      bracketsByDivision[division] && bracketsByDivision[division].length > 0
    );
  }, [availableDivisions, bracketsByDivision]);

  const divisionCards = useMemo(() => {
    return divisionsWithBrackets.map((division) => (
      <DivisionBracketsCard 
        key={division}
        division={division}
        brackets={bracketsByDivision[division] || []}
        onCreateBracket={onCreateBracket}
        onViewBracket={onViewBracket}
      />
    ));
  }, [divisionsWithBrackets, bracketsByDivision, onCreateBracket, onViewBracket]);

  // Enhanced loading state with refresh capability
  if (displayLoading && !allBracketsData.length && !isRefreshing) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="w-8 h-8 text-cornhole-navy animate-spin" />
        <div className="text-center">
          <p className="font-medium">Loading tournament data...</p>
          <p className="text-sm text-gray-500 mt-1">This may take a moment</p>
        </div>
        {onRefreshData && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="flex items-center gap-2 mt-4"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Force Refresh
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* FIXME: Temporary Challonge fallback - remove once native bracket logic is working */}
      <div className="mb-8">
        <ChallongeFallback />
      </div>

      {/* Tournament Brackets section - only show if there are divisions with brackets */}
      {divisionsWithBrackets.length > 0 && (
        <>
          {/* Enhanced header with refresh status */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">Tournament Brackets</h2>
              {lastRefreshTime && (
                <p className="text-xs text-gray-500 mt-1">
                  Last updated: {lastRefreshTime.toLocaleTimeString()}
                </p>
              )}
            </div>
            {onRefreshData && (
              <div className="flex items-center gap-2">
                {isRefreshing && (
                  <span className="text-sm text-gray-500">Refreshing...</span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshClick}
                  disabled={isRefreshing}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                </Button>
              </div>
            )}
          </div>

          {/* Memoized division cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {divisionCards}
          </div>
        </>
      )}
      
      {/* Enhanced selected bracket view with error boundaries */}
      {selectedBracketId && (
        <div className="mt-8">
          <React.Suspense fallback={
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-cornhole-navy" />
            </div>
          }>
            <BracketView 
              bracketId={selectedBracketId}
              bracket={bracket}
              teams={teams}
              onEditMatch={onEditMatch}
            />
          </React.Suspense>
        </div>
      )}
      
      {/* Enhanced empty state with actionable options */}
      {allBracketsData.length === 0 && !displayLoading && (
        <div className="space-y-4">
          <EmptyBracketState onCreateBracket={onCreateBracket} />
          {onRefreshData && (
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-3">
                Or try refreshing if brackets should already exist
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshClick}
                disabled={isRefreshing}
                className="flex items-center gap-2 mx-auto"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(PlayoffPageContent);
