
import React from "react";
import MatchCard from "./MatchCard";
import EmptyMatchList from "./EmptyMatchList";
import { Match } from "@/types";

interface MatchGridProps {
  matches: Match[];
  searchTerm: string;
  isCompleted: boolean;
  onEdit?: (match: Match) => void;
  onDelete?: (matchId: string) => void;
}

const MatchGrid: React.FC<MatchGridProps> = ({ 
  matches, 
  searchTerm, 
  isCompleted,
  onEdit,
  onDelete
}) => {
  if (matches.length === 0) {
    return <EmptyMatchList searchTerm={searchTerm} isCompleted={isCompleted} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {matches.map(match => (
        <MatchCard 
          key={match.id} 
          match={match}
          isCompleted={isCompleted}
          onEdit={!isCompleted ? onEdit : undefined}
          onDelete={!isCompleted ? onDelete : undefined}
        />
      ))}
    </div>
  );
};

export default MatchGrid;
