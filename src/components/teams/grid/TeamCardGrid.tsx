
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
import { gradients } from "@/styles/design-system";

interface TeamCardGridProps {
  team: Team;
  onDelete?: (id: string) => void;
  onEdit?: (team: Team) => void;
}

export const TeamCardGrid: React.FC<TeamCardGridProps> = ({ team, onDelete, onEdit }) => {
  const location = useLocation();
  const isAdminPage = location.pathname.includes('/admin');
  const powerScoreColor = getPowerScoreColor(team.power_score);
  const sosColor = getSosColor(team.sos);

  // Improved gradients for headers and backgrounds
  const headerGradient = "bg-gradient-to-br from-blue-50 via-gray-50 to-orange-50/20 dark:from-gray-800/70 dark:via-gray-800/80 dark:to-gray-800/70";
  const contentGradient = "bg-gradient-to-br from-white to-gray-50/70 dark:from-[#1E1E1E] dark:to-gray-900/90";

  return (
    <div className={cn(
      "rounded-lg border border-gray-200 dark:border-gray-800/60",
      "bg-white text-[#1a1a1a] dark:bg-[#1E1E1E] dark:text-white",
      "h-full shadow-sm transition-all duration-200",
      "hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
      gradients.card.blueOrange
    )}>
      <Link to={`/teams/${team.id}`} className="block">
        <div className={cn(
          "h-28 sm:h-32 relative flex items-center justify-center p-4",
          headerGradient
        )}>
          <TeamImage 
            imageUrl={team.imageUrl || team.logoUrl} 
            teamName={team.name}
            size="sm"
            className="max-h-20 sm:max-h-24 object-contain"
          />
        </div>
      </Link>
      
      <div className={cn("flex flex-col flex-grow p-3 sm:p-4", contentGradient)}>
        <div className="flex justify-between items-start mb-1">
          <Link to={`/teams/${team.id}`} className="hover:underline">
            <h3 className="font-bebas font-normal uppercase tracking-wide text-xl truncate pr-2 text-[#1a1a1a] dark:text-white" title={team.name}>
              {team.name}
            </h3>
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 text-gray-500 dark:text-gray-300 hover:text-[#1a1a1a] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10">
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
            className="self-start mb-3 font-inter uppercase text-xs tracking-widest"
          >
            {team.divisionName}
          </Badge>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <StatBlock 
            label="Record" 
            value={<span className="font-mono text-base">{team.wins}-{team.losses}</span>}
            gradient="bg-gradient-to-br from-white via-blue-50/20 to-blue-50/40 dark:from-gray-800/90 dark:to-gray-900/80"
          />
          <StatBlock 
            label="Power Score" 
            value={
              <span className={`font-mono text-base ${powerScoreColor}`}>
                {formatPowerScore(team.power_score)}
              </span>
            }
            gradient="bg-gradient-to-br from-white via-white to-orange-50/30 dark:from-gray-800/90 dark:to-gray-900/80"
          />
        </div>
      </div>
    </div>
  );
};
