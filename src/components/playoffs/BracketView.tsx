
import React, { useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBracketData } from "@/hooks/brackets/useBracketData";
import { useBracketCompletion } from "@/hooks/useBracketCompletion";
import { BracketsViewerComponent } from "./viewer";
import { FinalStandings } from "./FinalStandings";
import BracketErrorBoundary from "./BracketErrorBoundary";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { log, bracketLog, errorLog, debugLog } from "@/utils/logger";

interface BracketViewProps {
  bracketId: string;
  bracket?: any;
  teams?: any[];
  onEditMatch?: (matchId: string) => void;
}

const BracketView: React.FC<BracketViewProps> = ({
  bracketId,
  bracket: legacyBracket,
  teams: legacyTeams,
  onEditMatch
}) => {
  const hookCallCount = useRef(0);
  const renderCount = useRef(0);
  
  hookCallCount.current++;
  renderCount.current++;
  
  log(`BracketView hooks called: ${hookCallCount.current}, render: ${renderCount.current}`, {
    bracketId,
    hasLegacyBracket: !!legacyBracket
  });
  
  bracketLog('BracketView rendering with props:', {
    bracketId,
    hasLegacyBracket: !!legacyBracket,
    hasLegacyTeams: !!legacyTeams
  });
  
  useEffect(() => {
    log('BracketView MOUNTED', { bracketId });
    return () => {
      log('BracketView UNMOUNTED', { bracketId });
    };
  }, [bracketId]);
  
  useEffect(() => {
    debugLog('BracketView props changed:', {
      bracketId,
      hasLegacyBracket: !!legacyBracket
    });
  }, [bracketId, legacyBracket, legacyTeams]);
  
  const { data: bracketInfo, isLoading: isLoadingBracketInfo, error: bracketInfoError } = useQuery({
    queryKey: ['bracket-info', bracketId],
    queryFn: async () => {
      bracketLog('Fetching bracket info for JSONB check:', bracketId);
      const { data, error } = await supabase
        .from('brackets')
        .select('id, title, format, state, uses_brackets_manager, bracket_data, participants')
        .eq('id', bracketId)
        .single();
      
      if (error) {
        errorLog('Error fetching bracket info:', error);
        throw error;
      }
      
      bracketLog('Bracket info fetched:', {
        id: data.id,
        title: data.title,
        uses_brackets_manager: data.uses_brackets_manager,
        has_bracket_data: !!data.bracket_data
      });
      
      return data;
    },
    enabled: !!bracketId && typeof bracketId === 'string'
  });
  
  const { 
    data: fetchedBracket, 
    isLoading: isLoadingLegacy, 
    error: legacyError,
    refetch: refetchBracket
  } = useBracketData(bracketId);
  
  useBracketCompletion(bracketId || undefined);

  const handleMatchClick = useCallback((matchId: string) => {
    if (onEditMatch) {
      onEditMatch(matchId);
    }
  }, [onEditMatch]);
  
  if (!bracketId || typeof bracketId !== 'string' || bracketId.trim() === '') {
    errorLog('Invalid bracketId', { bracketId });
    return (
      <div className="p-8 text-center">
        <div className="text-gray-500">
          <p className="text-lg font-semibold mb-2">Invalid bracket ID</p>
          <p className="text-sm">Cannot display bracket without a valid identifier.</p>
        </div>
      </div>
    );
  }

  const isLoading = isLoadingBracketInfo || isLoadingLegacy;
  const error = bracketInfoError || legacyError;

  debugLog('Data fetching status:', {
    isLoadingBracketInfo,
    isLoadingLegacy,
    hasLegacyBracket: !!legacyBracket,
    bracketInfo: bracketInfo ? { id: bracketInfo.id } : null
  });

  const isJsonbBracket = bracketInfo?.uses_brackets_manager && bracketInfo?.bracket_data;
  
  const displayBracket = useMemo(() => {
    if (legacyBracket) return legacyBracket;
    if (isJsonbBracket) return bracketInfo;
    return fetchedBracket;
  }, [legacyBracket, isJsonbBracket, bracketInfo, fetchedBracket]);

  const displayTeams = useMemo(() => {
    return legacyTeams || [];
  }, [legacyTeams]);

  const handleRetry = useCallback(async () => {
    bracketLog('Manual retry triggered for bracket:', bracketId);
    try {
      await refetchBracket();
      bracketLog('Manual retry completed successfully');
    } catch (retryError) {
      errorLog('Manual retry failed:', retryError);
    }
  }, [refetchBracket, bracketId]);


  if (isLoading && !legacyBracket && !isJsonbBracket) {
    debugLog('Showing loading state');
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-cornhole-navy" />
          <div>
            <p className="font-medium">Loading bracket data...</p>
            <p className="text-sm text-gray-500 mt-1">This may take a moment</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !legacyBracket && !isJsonbBracket) {
    debugLog('Showing error state:', error.message);
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>Failed to load bracket: {error.message}</p>
            </div>
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            onClick={handleRetry}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!displayBracket) {
    debugLog('Showing empty state - no bracket data');
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

  if (!isJsonbBracket && (!displayBracket.matches || !Array.isArray(displayBracket.matches))) {
    errorLog('CRITICAL - Bracket exists but matches is not an array!', {
      bracket: displayBracket,
      matchesProperty: displayBracket.matches
    });
    
    return (
      <div className="text-center p-8 space-y-3">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-lg font-medium text-red-700">Data Structure Error</p>
          <p className="text-sm text-red-600 mt-1">Bracket found but matches data is corrupted</p>
        </div>
      </div>
    );
  }

  bracketLog('About to render BracketsViewerComponent:', {
    isJsonbBracket,
    bracketId: displayBracket.id,
    matchesCount: displayBracket.matches?.length || 0
  });

  bracketLog('Rendering BracketsViewerComponent');
  
  const showStandings = displayBracket.state === 'completed';
  
  return (
    <div className="w-full h-full min-h-[400px] md:min-h-[600px] space-y-4">
      <FinalStandings bracketId={bracketId!} show={showStandings} />
      
      <BracketErrorBoundary bracketId={bracketId}>
        {displayBracket && displayBracket.id ? (
          <BracketsViewerComponent
            bracket={displayBracket}
            teams={displayBracket.teams || displayTeams}
            onMatchClick={handleMatchClick}
          />
        ) : (
          <div className="text-center p-8 text-gray-500">
            <p>Invalid bracket data</p>
          </div>
        )}
      </BracketErrorBoundary>
    </div>
  );
};

export default React.memo(BracketView);
