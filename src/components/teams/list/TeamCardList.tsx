import React from "react";
import { Team } from "@/types";
import { Link } from "react-router-dom";
import { TeamImage } from "../shared/TeamImage";
import { StatBlock } from "../shared/StatBlock";
import { Trophy, X, MoreHorizontal, Edit, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { formatPowerScore, getPowerScoreColor } from "@/utils/powerScore";
import { PlayerChip } from "../shared/PlayerChip";

interface TeamCardListProps {
  team: Team;
  onDelete?: (id: string) => void;
  onEdit?: (team: Team) => void;
}

export const TeamCardList: React.FC<TeamCardListProps> = ({ team, onDelete, onEdit }) => {
  const cardBg = "bg-white text-[#1a1a1a] dark:bg-[#1E1E1E] dark:text-white border border-[#e0e0e0] dark:border-gray-800 rounded-xl";
  const powerScoreColor = getPowerScoreColor(team.power_score);

  return (
    <div className={`${cardBg} overflow-hidden h-full mb-4 font-inter shadow-sm hover:shadow-md transition-all duration-200 
      hover:border-opacity-80 dark:hover:bg-[#252525] active:scale-[0.995]`}>
      <div className="flex flex-col md:flex-row h-full">
        <Link to={`/teams/${team.id}`} className="w-full md:w-[150px] h-[150px] md:h-auto flex items-center justify-center p-6 bg-[#f0f0f0] dark:bg-black/30">
          <TeamImage 
            imageUrl={team.imageUrl || team.logoUrl} 
            teamName={team.name}
            size="md"
          />
        </Link>

        <div className="flex flex-col flex-grow p-4">
          <div className="flex justify-between items-start mb-2">
            <Link to={`/teams/${team.id}`} className="hover:underline">
              <h3 className="text-xl font-bold text-[#1a1a1a] dark:text-white">
                {team.name}
              </h3>
            </Link>
            
            {(onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 dark:text-gray-300 hover:text-[#1a1a1a] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10">
                    <MoreHorizontal size={18} />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(team)} className="cursor-pointer">
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={() => onDelete(team.id)} className="text-destructive focus:text-destructive cursor-pointer">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to={`/teams/${team.id}`}>
                      <ExternalLink className="mr-2 h-4 w-4" /> View Details
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {team.divisionName && (
            <Badge 
              variant={team.divisionName.toLowerCase().includes("competitive") ? "competitive" : 
                team.divisionName.toLowerCase().includes("intermediate") ? "intermediate" : "recreational"}
              className="mb-3 self-start"
            >
              {team.divisionName}
            </Badge>
          )}
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 text-sm">
            <StatBlock 
              label="Record" 
              value={
                <div className="flex items-center gap-1">
                  <Trophy size={12} className="text-emerald-400" /> {team.wins}
                  <span className="mx-1">-</span>
                  <X size={12} className="text-rose-400" /> {team.losses}
                </div>
              }
            />
            
            <StatBlock 
              label="Games" 
              value={`${team.game_wins ?? 0} - ${team.game_losses ?? 0}`}
            />
            
            <StatBlock 
              label="Power Score" 
              value={
                <span className={powerScoreColor}>
                  {formatPowerScore(team.power_score)}
                </span>
              }
            />
            
            <StatBlock 
              label="SOS" 
              value={team.sos?.toFixed(3) || '0.000'}
            />
          </div>
          
          <div className="flex flex-wrap gap-1.5 mt-auto">
            {team.players && team.players.length > 0 ? (
              team.players.map((player, index) => (
                <PlayerChip key={`${player}-${index}`} playerName={player} />
              ))
            ) : (
              <span className="text-xs text-gray-500 dark:text-gray-400">No players</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
