
import React, { useRef, useEffect } from 'react';
import { Team } from "@/types";
import { TeamList } from "@/components/teams/TeamList";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';

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
  
  // Auto-scroll when expanded
  useEffect(() => {
    if (isExpanded && sectionRef.current) {
      const yOffset = -100; // Adjust this value based on your header height
      const y = sectionRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({
        top: y,
        behavior: 'smooth'
      });
    }
  }, [isExpanded]);

  if (teams.length === 0) return null;

  // Division color mapping
  const getDivisionVariant = () => {
    if (!divisionName) return "outline";
    
    const lowerDivName = divisionName.toLowerCase();
    if (lowerDivName.includes("competitive")) return "competitive";
    if (lowerDivName.includes("intermediate")) return "intermediate";
    if (lowerDivName.includes("recreational")) return "recreational";
    return "outline";
  };

  const divisionVariant = getDivisionVariant();

  return (
    <div className="space-y-3 border-b pb-6 last:border-b-0" ref={sectionRef}>
      <div 
        className="flex justify-between items-center cursor-pointer bg-muted/30 rounded-md px-3 py-2 
          hover:bg-muted/50 transition-colors border border-transparent hover:border-muted" 
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2">
          <Badge variant={divisionVariant} className="px-3 py-1.5">
            {divisionName} <span className="ml-1.5 opacity-80">({teams.length})</span>
          </Badge>
        </div>
        <Button variant="ghost" size="sm" className="p-1 h-8 w-8 transition-transform duration-300" 
          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <ChevronDown size={20} />
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
            <div className="pt-2">
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
