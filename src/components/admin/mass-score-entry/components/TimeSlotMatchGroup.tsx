
import React, { useState, useEffect } from "react";
import { MatchWithTeams } from "../types";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import MatchRow from "../MatchRow";
import { motion } from "framer-motion";

interface TimeSlotMatchGroupProps {
  timeSlot: string;
  matches: MatchWithTeams[];
  onScoreChange: (index: number, team1Score: number, team2Score: number) => void;
  onGameWinsChange: (index: number, team1GameWins: number, team2GameWins: number) => void;
  onMarkCompleted: (index: number, checked: boolean) => void;
  submitting?: boolean;
  failedMatches?: string[];
  errorMessages?: Record<string, string>;
  onClearError?: (matchId: string) => void;
  defaultOpen?: boolean;
}

const TimeSlotMatchGroup: React.FC<TimeSlotMatchGroupProps> = ({
  timeSlot,
  matches,
  onScoreChange,
  onGameWinsChange,
  onMarkCompleted,
  submitting = false,
  failedMatches = [],
  errorMessages = {},
  onClearError,
  defaultOpen = false
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  // Debug log to track the matches in this group
  useEffect(() => {
    console.log(`TimeSlotMatchGroup "${timeSlot}" rendering with ${matches.length} matches:`, 
      matches.map((m, idx) => ({
        id: m.id,
        localIndex: idx,
        teams: `${m.team1?.name || 'Unknown'} vs ${m.team2?.name || 'Unknown'}`
      }))
    );
  }, [timeSlot, matches]);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="mb-2 overflow-hidden"
    >
      <CollapsibleTrigger 
        className={cn(
          "flex w-full items-center justify-between p-2 text-left text-sm rounded transition-all",
          "bg-accent/60 hover:bg-accent"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{timeSlot}</span>
          <span className="text-xs bg-primary/10 px-1.5 py-0.5 rounded">
            {matches.length} {matches.length === 1 ? 'match' : 'matches'}
          </span>
        </div>
        <ChevronDown 
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen ? "transform rotate-180" : ""
          )} 
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {matches.map((match, localIndex) => {
            console.log(`Rendering match at timeslot "${timeSlot}":`, {
              id: match.id,
              localIndex,
              isCompleted: match.iscompleted
            });
            
            return (
              <div key={match.id} className="relative">
                <MatchRow
                  match={match}
                  index={localIndex} // Use local index for now
                  isSubmitting={submitting}
                  hasError={failedMatches?.includes(match.id)}
                  errorMessage={errorMessages?.[match.id]}
                  onScoreChange={(team1Score, team2Score) => 
                    onScoreChange(localIndex, team1Score, team2Score)
                  }
                  onGameWinsChange={(team1GameWins, team2GameWins) => 
                    onGameWinsChange(localIndex, team1GameWins, team2GameWins)
                  }
                  onMarkCompleted={(checked) => {
                    console.log(`TimeSlotMatchGroup: Marking match ${match.id} as ${checked ? 'completed' : 'incomplete'}`, {
                      localIndex
                    });
                    onMarkCompleted(localIndex, checked);
                  }}
                  onClearError={onClearError}
                />
              </div>
            );
          })}
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default TimeSlotMatchGroup;
