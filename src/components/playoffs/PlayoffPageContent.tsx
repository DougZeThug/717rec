
import React from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  
  // NEW: Additional props for compatibility
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
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  console.log('🎯 PlayoffPageContent: Rendering with selectedBracketId:', selectedBracketId);

  const handleRefreshClick = async () => {
    if (!onRefreshData || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      console.log('🎯 PlayoffPageContent: Manual refresh triggered');
      await onRefreshData();
      console.log('🎯 PlayoffPageContent: Manual refresh completed');
    } catch (error) {
      console.error("🎯 PlayoffPageContent: Failed to refresh data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Use bracketLoading if provided, otherwise fall back to general isLoading
  const displayLoading = bracketLoading !== undefined ? bracketLoading : isLoading;

  if (displayLoading && !allBracketsData.length) {
    return (
      <div className="flex flex-col items-center">
        <Loader2 className="w-8 h-8 text-cornhole-navy animate-spin mb-2" />
        <p>Loading tournament data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* FIXME: Temporary Challonge fallback - remove once native bracket logic is working */}
      <div className="mb-8">
        <ChallongeFallback />
      </div>

      {/* Header with refresh button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Tournament Brackets</h2>
        {onRefreshData && (
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
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {availableDivisions.map((division) => (
          <DivisionBracketsCard 
            key={division}
            division={division}
            brackets={bracketsByDivision[division] || []}
            onCreateBracket={onCreateBracket}
            onViewBracket={onViewBracket}
          />
        ))}
      </div>
      
      {/* Selected bracket view - supports both new and legacy patterns */}
      {selectedBracketId && (
        <div className="mt-8">
          <BracketView 
            bracketId={selectedBracketId}
            bracket={bracket}
            teams={teams}
            onEditMatch={onEditMatch}
          />
        </div>
      )}
      
      {allBracketsData.length === 0 && !displayLoading && (
        <EmptyBracketState onCreateBracket={onCreateBracket} />
      )}
    </div>
  );
};

export default PlayoffPageContent;
