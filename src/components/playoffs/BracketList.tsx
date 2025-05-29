
import React from "react";
import { PlayoffBracket } from "@/types";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import DivisionBracketsCard from "./DivisionBracketsCard";
import { Skeleton } from "@/components/ui/skeleton";

interface BracketListProps {
  divisions: string[];
  bracketsByDivision: Record<string, PlayoffBracket[]>;
  onCreateBracket: () => void;
  onViewBracket: (id: string) => void;
  onEditBracket: () => void;
  onDeleteBracket?: (id: string, name: string) => void;
  onResyncBracket?: (bracketId: string, challongeTournamentId: number) => void;
  isResyncLoading?: boolean;
  isLoading: boolean;
}

const BracketList: React.FC<BracketListProps> = ({
  divisions,
  bracketsByDivision,
  onCreateBracket,
  onViewBracket,
  onEditBracket,
  onDeleteBracket,
  onResyncBracket,
  isResyncLoading,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Playoff Brackets</h2>
        <Button onClick={onCreateBracket} className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          Create Bracket
        </Button>
      </div>
      
      {divisions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No divisions available. Create a bracket to get started.</p>
          <Button onClick={onCreateBracket} className="mt-4 flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Create First Bracket
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {divisions.map(division => (
            <DivisionBracketsCard
              key={division}
              division={division}
              brackets={bracketsByDivision[division] || []}
              onViewBracket={onViewBracket}
              onCreateBracket={onCreateBracket}
              onEditBracket={onEditBracket}
              onDeleteBracket={onDeleteBracket}
              onResyncBracket={onResyncBracket}
              isResyncLoading={isResyncLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BracketList;
