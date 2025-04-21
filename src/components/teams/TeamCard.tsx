
import React from "react";
import { Team } from "@/types";
import { TeamCardGrid } from "./grid/TeamCardGrid";
import { TeamCardList } from "./list/TeamCardList";

interface TeamCardProps {
  team: Team;
  onDelete: (id: string) => void;
  onEdit: (team: Team) => void;
  viewMode: 'grid' | 'list';
}

const TeamCard: React.FC<TeamCardProps> = ({ team, onDelete, onEdit, viewMode }) => {
  if (viewMode === 'list') {
    return <TeamCardList team={team} onDelete={onDelete} onEdit={onEdit} />;
  }
  
  return <TeamCardGrid team={team} onDelete={onDelete} onEdit={onEdit} />;
};

export default TeamCard;
