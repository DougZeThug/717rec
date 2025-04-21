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

interface TeamCardGridProps {
  team: Team;
  onDelete: (id: string) => void;
  onEdit: (team: Team) => void;
}

export const TeamCardGrid: React.FC<TeamCardGridProps> = ({ team, onDelete, onEdit }) => {
  const cardBg = "bg-white text-[#1a1a1a] dark:bg-[#1E1E1E] dark:text-white border border-[#e0e0e0] dark:border-none rounded-xl shadow-sm";
  const powerScoreColor = getPowerScoreColor(team.power_score);

  return (
    <div className={`${cardBg} overflow-hidden h-full flex flex-col mb-4 sm:mb-0 font-inter`}>
      <Link to={`/teams/${team.id}`} className="block">
        <div className="h-24 bg-[#f0f0f0] dark:bg-black/30 flex items-center justify-center p-3">
          <TeamImage 
            imageUrl={team.imageUrl || team.logoUrl} 
            teamName={team.name}
            size="sm"
          />
        </div>
      </Link>
      
      <div className="flex flex-col flex-grow p-4">
        <div className="flex justify-between items-start">
          <Link to={`/teams/${team.id}`} className="hover:underline">
            <h3 className="text-base truncate pr-2 font-bold text-[#1a1a1a] dark:text-white" title={team.name}>
              {team.name}
            </h3>
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 dark:text-gray-300 hover:text-[#1a1a1a] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10">
                <MoreHorizontal size={15} />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(team)} className="cursor-pointer">
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(team.id)} className="text-destructive focus:text-destructive cursor-pointer">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/teams/${team.id}`}>
                  <ExternalLink className="mr-2 h-4 w-4" /> View Details
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {team.divisionName && (
          <Badge 
            variant={team.divisionName.toLowerCase().includes("competitive") ? "competitive" : 
              team.divisionName.toLowerCase().includes("intermediate") ? "intermediate" : "recreational"}
            className="self-start mb-2"
          >
            {team.divisionName}
          </Badge>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <StatBlock 
            label="Record" 
            value={`${team.wins}-${team.losses}`}
          />
          
          <StatBlock 
            label="Power Score" 
            value={
              <span className={powerScoreColor}>
                {formatPowerScore(team.power_score)}
              </span>
            }
          />
        </div>
        
        <div className="text-[10px] text-gray-600 dark:text-gray-400 w-full truncate mt-2">
          {team.players?.length > 0
            ? team.players.slice(0, 2).join(', ') 
              + (team.players.length > 2 ? ` +${team.players.length - 2}` : '')
            : "No players"
          }
        </div>
      </div>
    </div>
  );
};
