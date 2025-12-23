
import React from "react";
import { Team } from "@/types";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
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

interface TeamCardListProps {
  team: Team;
  onDelete?: (id: string) => void;
  onEdit?: (team: Team) => void;
}

export const TeamCardList: React.FC<TeamCardListProps> = ({ team, onDelete, onEdit }) => {
  const location = useLocation();
  const isAdminPage = location.pathname.includes('/admin');
  const powerScoreColor = getPowerScoreColor(team.power_score);
  const sosColor = getSosColor(team.sos);

  return (
    <motion.div 
      className="team-list-card bg-white text-gray-900 dark:bg-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 rounded-xl 
        overflow-hidden h-full font-inter shadow-sm"
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="flex flex-col md:flex-row h-full">
        <Link to={`/teams/${team.id}`} className="team-list-card-image w-full md:w-[180px] lg:w-[200px] h-[180px] md:h-auto flex items-center justify-center p-6 
          bg-gradient-to-br from-blue-50/30 via-white to-orange-50/20 dark:from-gray-800/60 dark:via-black/40 dark:to-gray-800/50">
          <TeamImage 
            imageUrl={team.imageUrl || team.logoUrl} 
            teamName={team.name}
            size="md"
            className="max-h-[140px] object-contain"
          />
        </Link>

        <div className="flex flex-col flex-grow p-5">
          <div className="flex justify-between items-start mb-3">
            <Link to={`/teams/${team.id}`} className="hover:underline">
              <h3 className="font-bebas font-normal uppercase tracking-wide text-2xl md:text-3xl text-gray-900 dark:text-white">
                {team.name}
              </h3>
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 -mt-1 text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10">
                  <MoreHorizontal size={18} />
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
              variant={team.divisionName.toLowerCase().includes("hidden") ? "secondary" :
                team.divisionName.toLowerCase().includes("competitive") ? "competitive" : 
                team.divisionName.toLowerCase().includes("intermediate") ? "intermediate" : "recreational"}
              className={`mb-4 self-start font-inter uppercase text-xs tracking-widest ${
                team.divisionName.toLowerCase().includes("hidden") ? "bg-muted text-muted-foreground border-muted" : ""
              }`}
            >
              {team.divisionName}
            </Badge>
          )}
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-sm">
            <StatBlock 
              label="Record" 
              value={
                <div className="flex items-center gap-1 font-mono text-lg justify-end">
                  <Trophy size={14} className="text-emerald-400" /> {team.wins}
                  <span className="mx-1">-</span>
                  <X size={14} className="text-rose-400" /> {team.losses}
                </div>
              }
            />
            
            <StatBlock 
              label="Games" 
              value={
                <span className="font-mono text-lg justify-end flex">
                  {team.game_wins ?? 0} - {team.game_losses ?? 0}
                </span>
              }
            />
            
            <StatBlock 
              label="Power Score" 
              value={
                <span className={`font-mono text-lg justify-end flex ${powerScoreColor}`}>
                  {formatPowerScore(team.power_score)}
                </span>
              }
            />
            
            <StatBlock 
              label="SOS" 
              value={<span className={`font-mono text-lg justify-end flex ${(team.wins || 0) + (team.losses || 0) > 0 ? sosColor : 'text-muted-foreground'}`}>
                {(team.wins || 0) + (team.losses || 0) > 0 ? (team.sos?.toFixed(3) || 'N/A') : 'N/A'}
              </span>}
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
    </motion.div>
  );
};
