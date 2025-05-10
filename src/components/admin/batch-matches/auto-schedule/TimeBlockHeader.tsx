
import React from "react";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TimeBlockHeaderProps {
  blockName: string;
  teamCount: number;
  timeslots?: [string, string]; // Main and secondary timeslots
}

export const TimeBlockHeader: React.FC<TimeBlockHeaderProps> = ({ 
  blockName, 
  teamCount,
  timeslots 
}) => {
  const isOdd = teamCount % 2 !== 0;
  
  return (
    <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{blockName} Block</span>
        {timeslots && (
          <span className="text-xs text-muted-foreground">
            ({timeslots[0]}, {timeslots[1]})
          </span>
        )}
      </div>
      <Badge variant={isOdd ? "destructive" : "outline"} className="text-xs">
        {teamCount} Teams {isOdd && "(Odd Number)"}
      </Badge>
    </div>
  );
};
