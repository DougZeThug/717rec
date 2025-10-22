
import React, { useCallback, useMemo } from "react";
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
  
  // First, check if this is a JSONB bracket
  const { data: bracketInfo, isLoading: isLoadingBracketInfo, error: bracketInfoError } = useQuery({
    queryKey: ['bracket-info', bracketId],
    queryFn: async () => {
      if (!bracketId) return null;
      
      console.log('🔍 DEBUG: Fetching bracket info for JSONB check:', bracketId);
      const { data, error } = await supabase
        .from('brackets')
        .select('id, title, format, state, uses_brackets_manager, bracket_data, participants')
        .eq('id', bracketId)
        .single();
      
      if (error) {
        console.error('❌ DEBUG: Error fetching bracket info:', error);
        throw error;
      }
      
      console.log('✅ DEBUG: Bracket info fetched:', {
        id: data.id,
        title: data.title,
        uses_brackets_manager: data.uses_brackets_manager,
        has_bracket_data: !!data.bracket_data,
        bracket_data_keys: data.bracket_data ? Object.keys(data.bracket_data) : []
      });
      
      return data;
    },
    enabled: !!bracketId && !legacyBracket
  });
  
  // Enhanced data hook with refetch capability
  // Always call unconditionally to comply with Rules of Hooks
  const { 
    data: fetchedBracket, 
    isLoading: isLoadingLegacy, 
    error: legacyError,
    refetch: refetchBracket
  } = useBracketData(bracketId);
  
  // Monitor bracket completion for final standings
  useBracketCompletion(bracketId || undefined);

  // Combine loading states
  const isLoading = isLoadingBracketInfo || isLoadingLegacy;
  const error = bracketInfoError || legacyError;

  console.log('🖼️ DEBUG: Data fetching status:', {
    isLoadingBracketInfo,
    isLoadingLegacy,
    hasLegacyBracket: !!legacyBracket,
    bracketInfo: bracketInfo ? {
      id: bracketInfo.id,
      uses_brackets_manager: bracketInfo.uses_brackets_manager,
      has_bracket_data: !!bracketInfo.bracket_data
    } : null,
    fetchedBracket: fetchedBracket ? {
      id: fetchedBracket.id,
      matchesCount: fetchedBracket.matches?.length || 0
    } : null,
    timestamp: new Date().toISOString()
  });

  // If this is a JSONB bracket, use it directly
  const isJsonbBracket = bracketInfo?.uses_brackets_manager && bracketInfo?.bracket_data;
  
  // Memoized data selection for performance
  const displayBracket = useMemo(() => {
    // Priority: legacy prop > JSONB bracket > fetched bracket
    if (legacyBracket) return legacyBracket;
    if (isJsonbBracket) return bracketInfo;
    return fetchedBracket;
  }, [legacyBracket, isJsonbBracket, bracketInfo, fetchedBracket]);

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


  // Enhanced loading state with better UX
  if (isLoading && !legacyBracket && !isJsonbBracket) {
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
  if (error && !legacyBracket && !isJsonbBracket) {
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
          >
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

  // Skip matches validation for JSONB brackets (data is in bracket_data)
  if (!isJsonbBracket && (!displayBracket.matches || !Array.isArray(displayBracket.matches))) {
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

  console.log('🖼️ DEBUG: About to render BracketsViewerComponent:', {
    isJsonbBracket,
    bracketId: displayBracket.id,
    bracketName: displayBracket.title || displayBracket.name,
    matchesCount: displayBracket.matches?.length || 0,
    has_bracket_data: !!displayBracket.bracket_data,
    uses_brackets_manager: displayBracket.uses_brackets_manager,
    timestamp: new Date().toISOString()
  });

  // Handle match click for brackets
  const handleMatchClick = useCallback((matchId: string) => {
    if (onEditMatch) {
      onEditMatch(matchId);
    }
  }, [onEditMatch]);

  // All brackets use brackets-manager - render BracketsViewerComponent
  console.log('🎯 BracketView: Rendering BracketsViewerComponent');
  
  const showStandings = displayBracket.state === 'completed';
  
  return (
    <div className="w-full h-full min-h-[600px] space-y-4">
      {showStandings && <FinalStandings bracketId={bracketId!} />}
      
      <BracketErrorBoundary bracketId={bracketId}>
        <BracketsViewerComponent
          bracket={displayBracket}
          teams={displayBracket.teams || displayTeams}
          onMatchClick={handleMatchClick}
        />
      </BracketErrorBoundary>
    </div>
  );
};

export default React.memo(BracketView);
