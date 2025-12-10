import React, { useRef, useEffect } from 'react';
import { Team } from "@/types";
import { TeamList } from "@/components/teams/TeamList";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TeamsDivisionSectionProps {
  divisionName: string;
  divisionId: string;
  teams: Team[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
  isLoading: boolean;
  viewMode: 'grid' | 'list';
}

export const TeamsDivisionSection: React.FC<TeamsDivisionSectionProps> = ({
  divisionName,
  divisionId,
  teams,
  isExpanded,
  onToggleExpand,
  onEditTeam,
  onDeleteTeam,
  isLoading,
  viewMode
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isExpanded && sectionRef.current) {
      const yOffset = -80;
      const y = sectionRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, [isExpanded]);

  if (teams.length === 0) return null;

  return (
    <div className="space-y-2 border-b pb-3 sm:pb-6 last:border-b-0" ref={sectionRef}>
      <div 
        className={cn(
          "flex justify-between items-center cursor-pointer",
          "bg-gray-50/50 dark:bg-gray-900/50 rounded-lg",
          "px-3 py-2 sm:px-4 sm:py-3",
          "hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors"
        )}
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-bebas text-base sm:text-lg uppercase tracking-wide">
            {divisionName} 
            <span className="ml-1.5 text-muted-foreground text-sm font-inter font-normal">
              ({teams.length})
            </span>
          </h3>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="p-1 h-7 w-7 sm:h-8 sm:w-8 transition-transform duration-300" 
          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <ChevronDown size={18} />
        </Button>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-1 sm:pt-2">
              <TeamList 
                teams={teams}
                isLoading={isLoading}
                onEdit={onEditTeam}
                onDelete={onDeleteTeam}
                viewMode={viewMode}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
