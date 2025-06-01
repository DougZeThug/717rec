
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
 * Simplified bracket view component - no more complex data transformations
 */
const BracketView: React.FC<BracketViewProps> = ({
  bracketId,
  bracket: legacyBracket,
  teams: legacyTeams,
  onEditMatch
}) => {
  console.log('🎯 BracketView: Rendering with props:', {
    bracketId,
    hasLegacyBracket: !!legacyBracket,
    hasLegacyTeams: !!legacyTeams
  });
  
  // Use direct data hook when bracketId is provided
  const { data: bracket, isLoading, error } = useBracketData(bracketId);

  // Use legacy data if provided, otherwise use new data
  const displayBracket = legacyBracket || bracket;
  const displayTeams = legacyTeams || [];

  console.log('🎯 BracketView: Display data:', {
    displayBracket: displayBracket?.name,
    matchesCount: displayBracket?.matches?.length,
    teamsCount: displayTeams?.length,
    isLoading,
    error: error?.message
  });

  // Simple loading state
  if (isLoading && !legacyBracket) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Loading bracket data...</p>
        </div>
      </div>
    );
  }

  // Simple error state
  if (error && !legacyBracket) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load bracket: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  // No bracket state
  if (!displayBracket) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No bracket selected</p>
      </div>
    );
  }

  return <SimpleBracket bracket={displayBracket} onMatchClick={onEditMatch} />;
};

export default BracketView;
