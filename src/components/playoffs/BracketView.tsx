import React, { useCallback, useMemo } from "react";
import { useBracketData } from "@/hooks/brackets/useBracketData";
import SimpleBracket from "@/components/brackets/SimpleBracket";
import BracketErrorBoundary from "./BracketErrorBoundary";
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
 * PHASE 4 DIAGNOSIS: Enhanced bracket view component with comprehensive logging
 */
const BracketView: React.FC<BracketViewProps> = ({
  bracketId,
  bracket: legacyBracket,
  teams: legacyTeams,
  onEditMatch
}) => {
  console.log('🎯 PHASE 4 DIAGNOSIS: BracketView rendering with props:', {
    bracketId,
    hasLegacyBracket: !!legacyBracket,
    legacyBracketMatches: legacyBracket?.matches?.length || 0,
    legacyBracketObject: legacyBracket,
    hasLegacyTeams: !!legacyTeams,
    legacyTeamsCount: legacyTeams?.length || 0
  });
  
  // PHASE 4 DIAGNOSIS: Enhanced data hook with refetch capability
  const { 
    data: fetchedBracket, 
    isLoading, 
    error,
    refetch: refetchBracket
  } = useBracketData(bracketId);

  console.log('🎯 PHASE 4 DIAGNOSIS: useBracketData hook result:', {
    fetchedBracket: fetchedBracket ? {
      id: fetchedBracket.id,
      name: fetchedBracket.name,
      matchesCount: fetchedBracket.matches?.length || 0,
      matchesArray: fetchedBracket.matches,
      matchesIsArray: Array.isArray(fetchedBracket.matches),
      teamsCount: fetchedBracket.teams?.length || 0,
      completeObject: fetchedBracket
    } : null,
    isLoading,
    error: error?.message,
    bracketId
  });

  // PHASE 4 DIAGNOSIS: Memoized data selection for performance with enhanced logging
  const displayBracket = useMemo(() => {
    const result = legacyBracket || fetchedBracket;
    console.log('🎯 PHASE 4 DIAGNOSIS: displayBracket selection:', {
      usingLegacy: !!legacyBracket,
      usingFetched: !!fetchedBracket,
      finalResult: result ? {
        id: result.id,
        name: result.name,
        matchesCount: result.matches?.length || 0,
        matchesArray: result.matches,
        matchesIsArray: Array.isArray(result.matches),
        hasMatches: !!(result.matches && result.matches.length > 0),
        completeObject: result
      } : null
    });
    return result;
  }, [legacyBracket, fetchedBracket]);

  const displayTeams = useMemo(() => {
    return legacyTeams || [];
  }, [legacyTeams]);

  // PHASE 4 DIAGNOSIS: Optimistic retry handler
  const handleRetry = useCallback(async () => {
    console.log('🎯 PHASE 4 DIAGNOSIS: Retrying bracket data fetch');
    try {
      await refetchBracket();
    } catch (retryError) {
      console.error('🎯 PHASE 4 DIAGNOSIS: Retry failed:', retryError);
    }
  }, [refetchBracket]);

  console.log('🎯 PHASE 4 DIAGNOSIS: Pre-render final state:', {
    displayBracket: displayBracket ? {
      id: displayBracket.id,
      name: displayBracket.name,
      matchesCount: displayBracket.matches?.length || 0,
      matchesExists: !!displayBracket.matches,
      matchesIsArray: Array.isArray(displayBracket.matches),
      matchesLength: displayBracket.matches?.length,
      firstMatch: displayBracket.matches?.[0],
      allMatches: displayBracket.matches
    } : null,
    teamsCount: displayTeams?.length,
    isLoading,
    error: error?.message,
    willRenderSimpleBracket: !!displayBracket
  });

  // PHASE 4 DIAGNOSIS: Enhanced loading state with better UX
  if (isLoading && !legacyBracket) {
    console.log('🎯 PHASE 4 DIAGNOSIS: Showing enhanced loading state');
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

  // PHASE 4 DIAGNOSIS: Enhanced error state with retry functionality
  if (error && !legacyBracket) {
    console.log('🎯 PHASE 4 DIAGNOSIS: Showing enhanced error state:', error.message);
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

  // PHASE 4 DIAGNOSIS: Enhanced empty state with more context
  if (!displayBracket) {
    console.log('🎯 PHASE 4 DIAGNOSIS: No bracket available - showing enhanced empty state');
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

  // PHASE 4 DIAGNOSIS: Critical check before rendering SimpleBracket
  if (!displayBracket.matches || !Array.isArray(displayBracket.matches)) {
    console.error('🎯 PHASE 4 DIAGNOSIS: CRITICAL - Bracket exists but matches is not an array!', {
      bracket: displayBracket,
      matchesProperty: displayBracket.matches,
      typeOfMatches: typeof displayBracket.matches,
      isArray: Array.isArray(displayBracket.matches)
    });
    
    return (
      <div className="text-center p-8 space-y-3">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-lg font-medium text-red-700">Data Structure Error</p>
          <p className="text-sm text-red-600 mt-1">Bracket found but matches data is corrupted</p>
          <div className="text-xs text-red-500 mt-2">
            <p>Bracket ID: {displayBracket.id}</p>
            <p>Matches property type: {typeof displayBracket.matches}</p>
            <p>Is array: {Array.isArray(displayBracket.matches) ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>
    );
  }

  console.log('🎯 PHASE 4 DIAGNOSIS: About to render SimpleBracket with:', {
    bracketId: displayBracket.id,
    bracketName: displayBracket.name,
    matchesCount: displayBracket.matches.length,
    matchesArray: displayBracket.matches,
    hasOnEditMatch: !!onEditMatch,
    passingToBracket: {
      ...displayBracket,
      matchesLength: displayBracket.matches.length
    }
  });

  // PHASE 4 DIAGNOSIS: Return SimpleBracket with enhanced error boundary
  return (
    <div>
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <div className="text-sm text-blue-700">
          🎯 PHASE 4 DEBUG: Rendering SimpleBracket | 
          Bracket: {displayBracket.name} | 
          Matches: {displayBracket.matches.length} | 
          Teams: {displayTeams.length}
        </div>
      </div>
      
      <BracketErrorBoundary bracketId={bracketId}>
        <SimpleBracket bracket={displayBracket} onMatchClick={onEditMatch} />
      </BracketErrorBoundary>
    </div>
  );
};

export default React.memo(BracketView);
