
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

const BracketView: React.FC<BracketViewProps> = ({
  bracketId,
  bracket: legacyBracket,
  teams: legacyTeams,
  onEditMatch
}) => {
  console.log('BracketView rendering with:', {
    bracketId,
    hasLegacyBracket: !!legacyBracket,
    hasLegacyTeams: !!legacyTeams
  });
  
  // Enhanced data hook with refetch capability
  const { 
    data: fetchedBracket, 
    isLoading, 
    error,
    refetch: refetchBracket
  } = useBracketData(bracketId);

  console.log('useBracketData result:', {
    fetchedBracket: fetchedBracket ? {
      id: fetchedBracket.id,
      name: fetchedBracket.title || fetchedBracket.name,
      matchesCount: fetchedBracket.matches?.length || 0
    } : null,
    isLoading,
    error: error?.message
  });

  // Memoized data selection for performance
  const displayBracket = useMemo(() => {
    const result = legacyBracket || fetchedBracket;
    console.log('displayBracket selection:', {
      usingLegacy: !!legacyBracket,
      usingFetched: !!fetchedBracket,
      finalResult: result ? {
        id: result.id,
        name: result.title || result.name,
        matchesCount: result.matches?.length || 0
      } : null
    });
    return result;
  }, [legacyBracket, fetchedBracket]);

  const displayTeams = useMemo(() => {
    return legacyTeams || [];
  }, [legacyTeams]);

  // Optimistic retry handler
  const handleRetry = useCallback(async () => {
    console.log('Retrying bracket data fetch');
    try {
      await refetchBracket();
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    }
  }, [refetchBracket]);

  // Enhanced loading state with better UX
  if (isLoading && !legacyBracket) {
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

  // Enhanced error state with retry functionality
  if (error && !legacyBracket) {
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

  // Enhanced empty state with more context
  if (!displayBracket) {
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

  // Critical check before rendering SimpleBracket
  if (!displayBracket.matches || !Array.isArray(displayBracket.matches)) {
    console.error('CRITICAL - Bracket exists but matches is not an array!', {
      bracket: displayBracket,
      matchesProperty: displayBracket.matches,
      typeOfMatches: typeof displayBracket.matches
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

  console.log('About to render SimpleBracket with:', {
    bracketId: displayBracket.id,
    bracketName: displayBracket.title || displayBracket.name,
    matchesCount: displayBracket.matches.length
  });

  // Return SimpleBracket with enhanced error boundary
  return (
    <BracketErrorBoundary bracketId={bracketId}>
      <SimpleBracket bracket={displayBracket} onMatchClick={onEditMatch} />
    </BracketErrorBoundary>
  );
};

export default React.memo(BracketView);
