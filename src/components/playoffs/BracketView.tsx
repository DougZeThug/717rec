
import React from "react";
import { useBracketData } from "@/hooks/brackets/useBracketData";
import SimpleBracket from "@/components/brackets/SimpleBracket";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BracketViewProps {
  bracketId: string | null;
  onEditMatch?: (matchId: string) => void;
}

/**
 * Simplified bracket view component
 */
const BracketView: React.FC<BracketViewProps> = ({
  bracketId,
  onEditMatch
}) => {
  console.log('🎯 BracketView: Rendering with bracketId:', bracketId);
  
  const { data: bracket, isLoading, error } = useBracketData(bracketId);

  console.log('🎯 BracketView: Hook results:', {
    bracket: bracket?.name,
    matchesCount: bracket?.matches?.length,
    isLoading,
    error: error?.message
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Loading bracket data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load bracket: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!bracket) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No bracket selected</p>
      </div>
    );
  }

  return <SimpleBracket bracket={bracket} onMatchClick={onEditMatch} />;
};

export default BracketView;
