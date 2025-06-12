
import React, { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MatchWithTeams } from "../types";
import MatchScoreRow from "./MatchScoreRow";

interface DateMatchGroupProps {
  date: Date;
  matches: (MatchWithTeams & { originalIndex: number })[];
  defaultExpanded: boolean;
  onScoreChange: (index: number, team1Score: number, team2Score: number) => void;
  onGameWinsChange: (index: number, team1GameWins: number, team2GameWins: number) => void;
  onMarkCompleted: (index: number, checked: boolean) => void;
  submitting: boolean;
  failedMatches: string[];
  errorMessages: Record<string, string>;
  onClearError?: (matchId: string) => void;
}

const DateMatchGroup: React.FC<DateMatchGroupProps> = ({
  date,
  matches,
  defaultExpanded,
  onScoreChange,
  onGameWinsChange,
  onMarkCompleted,
  submitting,
  failedMatches,
  errorMessages,
  onClearError
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const editedCount = matches.filter(m => m.isEdited).length;
  const completedCount = matches.filter(m => m.iscompleted).length;

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="p-3 sm:p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-primary" />
            <div>
              <h3 className="font-semibold text-base">
                {format(date, "EEEE, MMMM d, yyyy")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {matches.length} matches • {editedCount} edited • {completedCount} completed
              </p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="p-0">
              <div className="space-y-1">
                {matches.map((match) => (
                  <MatchScoreRow
                    key={match.id}
                    match={match}
                    index={match.originalIndex} // Use the original index
                    onScoreChange={onScoreChange}
                    onGameWinsChange={onGameWinsChange}
                    onMarkCompleted={onMarkCompleted}
                    submitting={submitting}
                    hasError={failedMatches.includes(match.id)}
                    errorMessage={errorMessages[match.id]}
                    onClearError={onClearError}
                  />
                ))}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default DateMatchGroup;
