import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Team } from '@/types';
import { TeamImage } from '../shared/TeamImage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { gradients } from '@/styles/design-system';
import { useIsMobile } from '@/hooks/use-mobile';

interface TeamCardGridProps {
  team: Team;
  onDelete?: (id: string) => void;
  onEdit?: (team: Team) => void;
}

export const TeamCardGrid: React.FC<TeamCardGridProps> = ({ team, onDelete, onEdit }) => {
  const location = useLocation();
  const isAdminPage = location.pathname.includes('/admin');
  const isMobile = useIsMobile();

  const headerGradient = "bg-gradient-to-br from-blue-50 via-gray-50 to-orange-50/20 dark:from-gray-800/70 dark:via-gray-800/80 dark:to-gray-800/70";
  const contentGradient = "bg-gradient-to-br from-white to-gray-50/70 dark:from-[#1E1E1E] dark:to-gray-900/90";

  return (
    <motion.div 
      className={cn(
        "rounded-lg border border-gray-200 dark:border-gray-800/60",
        "bg-white text-[#1a1a1a] dark:bg-[#1E1E1E] dark:text-white",
        "h-full shadow-sm",
        gradients.card.blueOrange
      )}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Link to={`/teams/${team.id}`} className="block">
        <div className={cn(
          "relative flex items-center justify-center",
          isMobile ? "h-16 p-2" : "h-24 p-3",
          headerGradient
        )}>
          <TeamImage 
            imageUrl={team.imageUrl || team.logoUrl} 
            teamName={team.name}
            size="sm"
            className={cn("object-contain", isMobile ? "max-h-12" : "max-h-16")}
          />
        </div>
      </Link>
      
      <div className={cn("flex flex-col flex-grow", isMobile ? "p-1.5" : "p-2 sm:p-3", contentGradient)}>
        <div className="flex justify-between items-start">
          <Link to={`/teams/${team.id}`} className="hover:underline flex-1 min-w-0">
            <h3 className={cn(
              "font-bebas font-normal uppercase tracking-wide truncate text-[#1a1a1a] dark:text-white",
              isMobile ? "text-sm" : "text-base sm:text-lg"
            )} title={team.name}>
              {team.name}
            </h3>
          </Link>
          
          {!isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1 text-gray-500 dark:text-gray-300 hover:text-[#1a1a1a] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10">
                  <MoreHorizontal size={14} />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px]">
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
          )}
        </div>
        
        {/* Mobile: Single line of info (record only) */}
        {isMobile ? (
          <span className="text-xs text-muted-foreground font-mono">
            {team.wins}-{team.losses}
          </span>
        ) : (
          <>
            {team.divisionName && (
              <Badge 
                variant={team.divisionName.toLowerCase().includes("hidden") ? "secondary" :
                  team.divisionName.toLowerCase().includes("competitive") ? "competitive" : 
                  team.divisionName.toLowerCase().includes("intermediate") ? "intermediate" : "recreational"}
                className={cn(
                  "self-start mb-2 font-inter uppercase text-xs tracking-widest",
                  team.divisionName.toLowerCase().includes("hidden") && "bg-muted text-muted-foreground border-muted"
                )}
              >
                {team.divisionName}
              </Badge>
            )}

            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="rounded p-1.5 bg-gradient-to-br from-white via-blue-50/20 to-blue-50/40 dark:from-gray-800/90 dark:to-gray-900/80">
                <div className="text-[10px] text-muted-foreground uppercase">Record</div>
                <span className="font-mono text-sm">{team.wins}-{team.losses}</span>
              </div>
              <div className="rounded p-1.5 bg-gradient-to-br from-white via-white to-orange-50/30 dark:from-gray-800/90 dark:to-gray-900/80">
                <div className="text-[10px] text-muted-foreground uppercase">Power</div>
                <span className="font-mono text-sm">
                  {typeof team.power_score === 'number' ? (team.power_score * 100).toFixed(1) : 'N/A'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};
