
import React from "react";
import { useBracketData } from "@/hooks/brackets/useBracketData";
import SimpleBracket from "@/components/brackets/SimpleBracket";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BracketViewProps {
  bracketId?: string | null;
  bracket?: any; // Legacy prop for backward compatibility
  teams?: any[]; // Legacy prop for backward compatibility
  onEditMatch?: (matchId: string) => void;
}

/**
 * PHASE 2 FIX: Improved bracket view component with better data handling
 */
const BracketView: React.FC<BracketViewProps> = ({
  bracketId,
  bracket: legacyBracket,
  teams: legacyTeams,
  onEditMatch
}) => {
  console.log('🎯 PHASE 2 FIX: BracketView rendering with props:', {
    bracketId,
    hasLegacyBracket: !!legacyBracket,
    legacyBracketMatches: legacyBracket?.matches?.length || 0,
    hasLegacyTeams: !!legacyTeams,
    legacyTeamsCount: legacyTeams?.length || 0
  });
  
  // Use direct data hook when bracketId is provided and no legacy bracket
  const { data: fetchedBracket, isLoading, error } = useBracketData(bracketId);

  // PHASE 2 FIX: Better data selection logic
  const displayBracket = legacyBracket || fetchedBracket;
  const displayTeams = legacyTeams || [];

  console.log('🎯 PHASE 2 FIX: BracketView display data decision:', {
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

  // Enhanced loading state - only show when actually loading and no legacy data
  if (isLoading && !legacyBracket) {
    console.log('🎯 PHASE 2 FIX: Showing loading state');
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Loading bracket data...</p>
          {bracketId && (
            <p className="text-xs text-gray-400 mt-1">Bracket ID: {bracketId}</p>
          )}
        </div>
      </div>
    );
  }

  // Enhanced error state with more details - only show when error and no legacy data
  if (error && !legacyBracket) {
    console.log('🎯 PHASE 2 FIX: Showing error state:', error.message);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load bracket: {error.message}
          {bracketId && (
            <div className="text-xs mt-1">Bracket ID: {bracketId}</div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // No bracket state with more context
  if (!displayBracket) {
    console.log('🎯 PHASE 2 FIX: No bracket available - showing empty state');
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No bracket selected</p>
        {bracketId && (
          <p className="text-xs text-gray-400 mt-1">
            Attempted to load bracket: {bracketId}
          </p>
        )}
      </div>
    );
  }

  console.log('🎯 PHASE 2 FIX: Rendering SimpleBracket with bracket:', {
    id: displayBracket.id,
    name: displayBracket.name,
    matchesCount: displayBracket.matches?.length || 0,
    hasOnEditMatch: !!onEditMatch
  });

  return <SimpleBracket bracket={displayBracket} onMatchClick={onEditMatch} />;
};

export default BracketView;
