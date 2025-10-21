
import React, { useCallback, useMemo } from "react";
import { useBracketData } from "@/hooks/brackets/useBracketData";
import { useBracketCompletion } from "@/hooks/useBracketCompletion";
import GlootBracket from "@/components/playoffs/GlootBracket";
import { ChallongeBracketDirect } from "./ChallongeBracketDirect";
import { FinalStandings } from "./FinalStandings";
import BracketErrorBoundary from "./BracketErrorBoundary";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useChallongeAdmin } from "@/hooks/useChallongeAdmin";
import { useToast } from "@/hooks/use-toast";

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
  console.log('🖼️ DEBUG: BracketView rendering with props:', {
    bracketId,
    bracketIdType: typeof bracketId,
    bracketIdValid: !!bracketId,
    hasLegacyBracket: !!legacyBracket,
    hasLegacyTeams: !!legacyTeams,
    legacyBracketInfo: legacyBracket ? {
      id: legacyBracket.id,
      name: legacyBracket.name,
      matchesCount: legacyBracket.matches?.length
    } : null,
    timestamp: new Date().toISOString()
  });
  
  // Enhanced data hook with refetch capability
  const { 
    data: fetchedBracket, 
    isLoading, 
    error,
    refetch: refetchBracket
  } = useBracketData(bracketId);
  
  // Challonge admin functionality
  const { resyncMatches } = useChallongeAdmin();
  const { toast } = useToast();
  
  // Monitor bracket completion for final standings
  useBracketCompletion(bracketId || undefined);

  console.log('🖼️ DEBUG: useBracketData hook result:', {
    fetchedBracket: fetchedBracket ? {
      id: fetchedBracket.id,
      name: fetchedBracket.name,
      matchesCount: fetchedBracket.matches?.length || 0,
      matchesIsArray: Array.isArray(fetchedBracket.matches),
      teamsCount: fetchedBracket.teams?.length || 0
    } : null,
    isLoading,
    error: error?.message,
    timestamp: new Date().toISOString()
  });

  // Memoized data selection for performance
  const displayBracket = useMemo(() => {
    const result = legacyBracket || fetchedBracket;
    console.log('🖼️ DEBUG: displayBracket selection:', {
      usingLegacy: !!legacyBracket,
      usingFetched: !!fetchedBracket,
      finalResult: result ? {
        id: result.id,
        name: result.name,
        matchesCount: result.matches?.length || 0,
        matchesIsArray: Array.isArray(result.matches),
        hasValidStructure: !!(result.id && result.name && Array.isArray(result.matches)),
        challonge_tournament_id: result.challonge_tournament_id,
        hasChallongeId: !!result.challonge_tournament_id
      } : null,
      timestamp: new Date().toISOString()
    });
    
    // CRITICAL DEBUG: Check if this bracket should use Challonge direct
    if (result?.challonge_tournament_id) {
      console.log('🎯 CRITICAL: This bracket HAS challonge_tournament_id:', result.challonge_tournament_id);
      console.log('🎯 CRITICAL: Will render ChallongeBracketDirect!');
    } else {
      console.log('🎯 CRITICAL: This bracket has NO challonge_tournament_id, using GlootBracket flow');
    }
    
    return result;
  }, [legacyBracket, fetchedBracket]);

  const displayTeams = useMemo(() => {
    return legacyTeams || [];
  }, [legacyTeams]);

  // Optimistic retry handler
  const handleRetry = useCallback(async () => {
    console.log('🔄 DEBUG: Manual retry triggered for bracket:', bracketId);
    try {
      await refetchBracket();
      console.log('🔄 DEBUG: Manual retry completed successfully');
    } catch (retryError) {
      console.error('🔄 DEBUG: Manual retry failed:', retryError);
    }
  }, [refetchBracket, bracketId]);

  // Challonge resync handler
  const handleChallongeResync = useCallback(async () => {
    if (!displayBracket?.challonge_tournament_id || !bracketId) {
      toast({
        title: "Resync Not Available",
        description: "This bracket is not connected to Challonge.",
        variant: "destructive"
      });
      return;
    }

    console.log('🔄 DEBUG: Challonge resync triggered for bracket:', bracketId);
    try {
      await resyncMatches.mutateAsync({ 
        bracketId, 
        challongeTournamentId: displayBracket.challonge_tournament_id 
      });
      
      // Refetch the bracket data after successful resync
      await refetchBracket();
      
      toast({
        title: "Sync Complete",
        description: "Bracket updated with latest Challonge data.",
      });
      
      console.log('🔄 DEBUG: Challonge resync completed successfully');
    } catch (syncError) {
      console.error('🔄 DEBUG: Challonge resync failed:', syncError);
      toast({
        title: "Sync Failed",
        description: "Failed to sync with Challonge. Please try again.",
        variant: "destructive"
      });
    }
  }, [displayBracket, bracketId, resyncMatches, refetchBracket, toast]);

  // Enhanced loading state with better UX
  if (isLoading && !legacyBracket) {
    console.log('🖼️ DEBUG: Showing loading state');
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
    console.log('🖼️ DEBUG: Showing error state:', error.message);
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
    console.log('🖼️ DEBUG: Showing empty state - no bracket data');
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

  // Critical check before rendering bracket viewer
  if (!displayBracket.matches || !Array.isArray(displayBracket.matches)) {
    console.error('🚨 DEBUG: CRITICAL - Bracket exists but matches is not an array!', {
      bracket: displayBracket,
      matchesProperty: displayBracket.matches,
      typeOfMatches: typeof displayBracket.matches,
      bracketKeys: Object.keys(displayBracket),
      timestamp: new Date().toISOString()
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

  console.log('🖼️ DEBUG: About to render GlootBracket viewer with valid data:', {
    bracketId: displayBracket.id,
    bracketName: displayBracket.name,
    matchesCount: displayBracket.matches.length,
    matchesIsArray: Array.isArray(displayBracket.matches),
    teamsCount: displayBracket.teams?.length || 0,
    timestamp: new Date().toISOString()
  });

  // Handle match click for brackets
  const handleMatchClick = useCallback((matchId: string) => {
    if (onEditMatch) {
      onEditMatch(matchId);
    }
  }, [onEditMatch]);

  // Check if this is a Challonge tournament - render ChallongeBracketDirect
  if (displayBracket.challonge_tournament_id) {
    console.log('🎯 BracketView: Rendering ChallongeBracketDirect for tournament:', displayBracket.challonge_tournament_id);
    return (
      <div className="w-full h-full min-h-[600px]">
        {/* Bracket header with sync button */}
        <div className="flex justify-between items-center mb-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <h3 className="font-semibold">{displayBracket.name}</h3>
            <p className="text-sm text-muted-foreground">
              Connected to Challonge Tournament #{displayBracket.challonge_tournament_id}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleChallongeResync}
            disabled={resyncMatches.isPending}
            className="flex items-center gap-2"
          >
            {resyncMatches.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync from Challonge
          </Button>
        </div>
        
        <BracketErrorBoundary bracketId={bracketId}>
          <ChallongeBracketDirect
            tournamentId={displayBracket.challonge_tournament_id}
            onEditMatch={handleMatchClick}
          />
        </BracketErrorBoundary>
      </div>
    );
  }

  // Return GlootBracket viewer for non-Challonge brackets
  console.log('🎯 BracketView: Rendering GlootBracket for standard bracket');
  
  const showStandings = displayBracket.state === 'completed' && displayBracket.uses_brackets_manager;
  
  return (
    <div className="w-full h-full min-h-[600px] space-y-4">
      {showStandings && <FinalStandings bracketId={bracketId!} />}
      
      <BracketErrorBoundary bracketId={bracketId}>
        <GlootBracket
          bracket={displayBracket}
          teams={displayBracket.teams || displayTeams}
          onEditMatch={handleMatchClick}
        />
      </BracketErrorBoundary>
    </div>
  );
};

export default React.memo(BracketView);
