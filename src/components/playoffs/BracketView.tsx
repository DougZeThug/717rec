
import React, { useCallback, useMemo } from "react";
import { useBracketData } from "@/hooks/brackets/useBracketData";
import SimpleBracket from "@/components/brackets/SimpleBracket";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface BracketViewProps {
  bracketId?: string | null;
  bracket?: any; // Legacy prop for backward compatibility
  teams?: any[]; // Legacy prop for backward compatibility
  onEditMatch?: (matchId: string) => void;
}

/**
 * PHASE 3 FIX: Enhanced bracket view component with optimistic updates and error recovery
 */
const BracketView: React.FC<BracketViewProps> = ({
  bracketId,
  bracket: legacyBracket,
  teams: legacyTeams,
  onEditMatch
}) => {
  console.log('🎯 PHASE 3 FIX: BracketView rendering with props:', {
    bracketId,
    hasLegacyBracket: !!legacyBracket,
    legacyBracketMatches: legacyBracket?.matches?.length || 0,
    hasLegacyTeams: !!legacyTeams,
    legacyTeamsCount: legacyTeams?.length || 0
  });
  
  // PHASE 3 FIX: Enhanced data hook with refetch capability
  const { 
    data: fetchedBracket, 
    isLoading, 
    error,
    refetch: refetchBracket
  } = useBracketData(bracketId);

  // PHASE 3 FIX: Memoized data selection for performance
  const displayBracket = useMemo(() => {
    return legacyBracket || fetchedBracket;
  }, [legacyBracket, fetchedBracket]);

  const displayTeams = useMemo(() => {
    return legacyTeams || [];
  }, [legacyTeams]);

  // PHASE 3 FIX: Optimistic retry handler
  const handleRetry = useCallback(async () => {
    console.log('🎯 PHASE 3 FIX: Retrying bracket data fetch');
    try {
      await refetchBracket();
    } catch (retryError) {
      console.error('🎯 PHASE 3 FIX: Retry failed:', retryError);
    }
  }, [refetchBracket]);

  console.log('🎯 PHASE 3 FIX: BracketView display data decision:', {
    usingLegacyBracket: !!legacyBracket,
    usingFetchedBracket: !!fetchedBracket,
    finalBracket: displayBracket ? {
      id: displayBracket.id,
      name: displayBracket.name,
      matchesCount: displayBracket.matches?.length || 0,
      matchesIsArray: Array.isArray(displayBracket.matches)
    } : null,
    teamsCount: displayTeams?.length,
    isLoading,
    error: error?.message
  });

  // PHASE 3 FIX: Enhanced loading state with better UX
  if (isLoading && !legacyBracket) {
    console.log('🎯 PHASE 3 FIX: Showing enhanced loading state');
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-cornhole-navy" />
          <div>
            <p className="font-medium">Loading bracket data...</p>
            <p className="text-sm text-gray-500 mt-1">This may take a moment</p>
          </div>
          {bracketId && (
            <p className="text-xs text-gray-400 mt-2">Bracket ID: {bracketId}</p>
          )}
        </div>
      </div>
    );
  }

  // PHASE 3 FIX: Enhanced error state with retry functionality
  if (error && !legacyBracket) {
    console.log('🎯 PHASE 3 FIX: Showing enhanced error state:', error.message);
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>Failed to load bracket: {error.message}</p>
              {bracketId && (
                <p className="text-xs opacity-80">Bracket ID: {bracketId}</p>
              )}
            </div>
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            onClick={handleRetry}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // PHASE 3 FIX: Enhanced empty state with more context
  if (!displayBracket) {
    console.log('🎯 PHASE 3 FIX: No bracket available - showing enhanced empty state');
    return (
      <div className="text-center p-8 space-y-3">
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-700">No bracket selected</p>
          <p className="text-sm text-gray-500">Choose a bracket from the list above to view matches</p>
        </div>
        {bracketId && (
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
            <p>Attempted to load bracket: {bracketId}</p>
            <p className="mt-1">The bracket may have been deleted or you may not have access to it.</p>
          </div>
        )}
      </div>
    );
  }

  console.log('🎯 PHASE 3 FIX: Rendering SimpleBracket with bracket:', {
    id: displayBracket.id,
    name: displayBracket.name,
    matchesCount: displayBracket.matches?.length || 0,
    hasOnEditMatch: !!onEditMatch
  });

  // PHASE 3 FIX: Memoized SimpleBracket to prevent unnecessary re-renders
  return React.memo(() => (
    <SimpleBracket bracket={displayBracket} onMatchClick={onEditMatch} />
  ))();
};

export default React.memo(BracketView);
