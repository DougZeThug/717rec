
import React from "react";
import MatchCard from "./MatchCard";
import EmptyMatchList from "./EmptyMatchList";
import { Match, Team } from "@/types";

interface MatchGridProps {
  matches: Match[];
  teams: Team[];
  searchTerm: string;
  isCompleted: boolean;
  onEdit: (match: Match) => void;
  onDelete: (matchId: string) => void;
}

const MatchGrid: React.FC<MatchGridProps> = ({ 
  matches, 
  teams, 
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
          teams={teams}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default MatchGrid;
