import React, { useState } from "react";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MatchWithTeams } from "../types";
import { motion } from "framer-motion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import MatchRow from "../MatchRow";

interface DateMatchGroupProps {
  date: Date;
  matches: MatchWithTeams[];
  defaultExpanded?: boolean;
  onScoreChange: (index: number, team1Score: number, team2Score: number) => void;
  onGameWinsChange: (index: number, team1GameWins: number, team2GameWins: number) => void;
  onMarkCompleted: (index: number, checked: boolean) => void;
  submitting?: boolean;
  failedMatches?: string[];
  errorMessages?: Record<string, string>;
  onClearError?: (matchId: string) => void;
}

const DateMatchGroup: React.FC<DateMatchGroupProps> = ({ 
  date, 
  matches, 
  defaultExpanded = false,
  onScoreChange,
  onGameWinsChange,
  onMarkCompleted,
  submitting,
  failedMatches,
  errorMessages,
  onClearError
}) => {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const formattedDate = format(date, "EEEE, MMMM d, yyyy");
  const isLight = false; // We'll handle this with CSS variables instead
  
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="mb-4 overflow-hidden bg-card"
    >
      <CollapsibleTrigger 
        className={cn(
          "flex w-full items-center justify-between p-4 text-left transition-all",
          "hover:bg-accent hover:text-accent-foreground",
          "border-b text-sm font-semibold"
        )}
      >
        <span>{formattedDate}</span>
        <ChevronDown 
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {matches.map((match, idx) => (
            <div key={match.id} className="relative">
              <MatchRow
                match={match}
                index={idx}
                isSubmitting={submitting}
                hasError={failedMatches?.includes(match.id)}
                errorMessage={errorMessages?.[match.id]}
                onScoreChange={onScoreChange}
                onGameWinsChange={onGameWinsChange}
                onMarkCompleted={onMarkCompleted}
                onClearError={onClearError}
              />
            </div>
          ))}
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default DateMatchGroup;
