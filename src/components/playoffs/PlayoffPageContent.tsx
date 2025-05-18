import React from "react";
import { Loader2 } from "lucide-react";
import DivisionBracketsCard from "@/components/playoffs/DivisionBracketsCard";
import BracketDetail from "@/components/playoffs/BracketDetail";
import EmptyBracketState from "@/components/playoffs/EmptyBracketState";
import { PlayoffBracket, Team } from "@/types";
import BracketView from "./BracketView";

interface PlayoffPageContentProps {
  availableDivisions: string[];
  bracketsByDivision: Record<string, Partial<PlayoffBracket>[]>;
  selectedBracketId: string | null;
  bracket: PlayoffBracket | null;
  teams: Team[];
  bracketLoading: boolean;
  allBracketsData: Partial<PlayoffBracket>[];
  isLoading: boolean;
  onCreateBracket: () => void;
  onViewBracket: (id: string) => void;
  onEditBracket: () => void;
  onEditMatch: (matchId: string) => void;
  onDeleteBracket?: (id: string, name: string) => void;
}

const PlayoffPageContent: React.FC<PlayoffPageContentProps> = ({
  availableDivisions,
  bracketsByDivision,
  selectedBracketId,
  bracket,
  teams,
  bracketLoading,
  allBracketsData,
  isLoading,
  onCreateBracket,
  onViewBracket,
  onEditBracket,
  onEditMatch,
  onDeleteBracket
}) => {
  if (isLoading && !allBracketsData.length) {
    return (
      <div className="flex flex-col items-center">
        <Loader2 className="w-8 h-8 text-cornhole-navy animate-spin mb-2" />
        <p>Loading tournament data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
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
      
      {/* Selected bracket view */}
      {bracket && (
        <div className="mt-8">
          <BracketView 
            bracket={bracket} 
            teams={teams} 
            onEditMatch={onEditMatch} 
          />
        </div>
      )}
      
      {allBracketsData.length === 0 && !isLoading && (
        <EmptyBracketState onCreateBracket={onCreateBracket} />
      )}
    </div>
  );
};

export default PlayoffPageContent;
