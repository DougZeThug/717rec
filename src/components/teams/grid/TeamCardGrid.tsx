
import React from "react";
import { Team } from "@/types";
import { Link, useLocation } from "react-router-dom";
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
import { formatPowerScore, getPowerScoreColor, getSosColor } from "@/utils/colors";
import { PlayerChip } from "../shared/PlayerChip";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TeamCardGridProps {
  team: Team;
  onDelete?: (id: string) => void;
  onEdit?: (team: Team) => void;
}

export const TeamCardGrid: React.FC<TeamCardGridProps> = ({ team, onDelete, onEdit }) => {
  const location = useLocation();
  const isAdminPage = location.pathname.includes('/admin');
  const cardBg = "bg-white text-[#1a1a1a] dark:bg-[#1E1E1E] dark:text-white border border-[#e0e0e0] dark:border-gray-800 rounded-xl";
  const powerScoreColor = getPowerScoreColor(team.power_score);
  const sosColor = getSosColor(team.sos);

  // Modified hover class with orange accent
  const hoverClass = "hover:bg-gradient-to-br hover:from-white hover:via-blue-50/10 hover:to-orange-50/30 dark:hover:bg-[#252525]";

  return (
    <div className={cn(
      cardBg, 
      "overflow-hidden h-full flex flex-col mb-4 sm:mb-0 font-inter shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] hover:border-opacity-80 active:scale-[0.98]", 
      hoverClass
    )}>
      <Link to={`/teams/${team.id}`} className="block">
        <div className="min-h-[4.5rem] sm:h-24 bg-gradient-to-br from-[#f0f0f0] to-gray-100 dark:from-black/30 dark:to-gray-900/40 flex items-center justify-center p-2 sm:p-3">
          <TeamImage 
            imageUrl={team.imageUrl || team.logoUrl} 
            teamName={team.name}
            size="sm"
            className="max-h-16 sm:max-h-20"
          />
        </div>
      </Link>
      
      <div className="flex flex-col flex-grow p-3 sm:p-4">
        <div className="flex justify-between items-start">
          <Link to={`/teams/${team.id}`} className="hover:underline">
            <h3 className="font-bebas font-normal uppercase tracking-wide text-xl truncate pr-2 text-[#1a1a1a] dark:text-white" title={team.name}>
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
            <DropdownMenuContent align="end" className="w-[200px]">
              {isAdminPage && onEdit && (
                <DropdownMenuItem onClick={() => onEdit(team)} className="cursor-pointer">
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}
              {isAdminPage && onDelete && (
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
        </div>
        
        {team.divisionName && (
          <Badge 
            variant={team.divisionName.toLowerCase().includes("competitive") ? "competitive" : 
              team.divisionName.toLowerCase().includes("intermediate") ? "intermediate" : "recreational"}
            className="self-start mb-2 font-inter uppercase text-xs tracking-widest"
          >
            {team.divisionName}
          </Badge>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <StatBlock 
            label="Record" 
            value={<span className="font-mono text-base text-center">{`${team.wins}-${team.losses}`}</span>}
            gradient="bg-gradient-to-br from-white via-white to-blue-50/20 dark:from-gray-800/90 dark:to-gray-900/80"
          />
          <StatBlock 
            label="Power Score" 
            value={
              <span className={`font-mono text-base text-center ${powerScoreColor}`}>
                {formatPowerScore(team.power_score)}
              </span>
            }
            gradient="bg-gradient-to-br from-white via-white to-orange-50/30 dark:from-gray-800/90 dark:to-gray-900/80"
          />
        </div>
        
        <div className="flex flex-wrap gap-1 mt-2 max-h-[30px] overflow-hidden">
          {team.players?.length > 0 ? (
            team.players.slice(0, 3).map((player, index) => (
              <PlayerChip key={`${player}-${index}`} playerName={player} />
            )).concat(
              team.players.length > 3 ? [
                <TooltipProvider key="more-players">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full inline-flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                        +{team.players.length - 3}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{team.players.slice(3).join(', ')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ] : []
            )
          ) : (
            <span className="text-xs text-gray-500 dark:text-gray-400">No players</span>
          )}
        </div>
      </div>
    </div>
  );
};
