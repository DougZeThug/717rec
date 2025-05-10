
import React from "react";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TimeBlockHeaderProps {
  blockName: string;
  teamCount: number;
  timeslots?: string[];
}

export const TimeBlockHeader: React.FC<TimeBlockHeaderProps> = ({
  blockName,
  teamCount,
  timeslots = []
}) => {
  return (
    <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{blockName} Block</span>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 mt-1 sm:mt-0">
        <Badge variant="outline" className="text-xs">
          {teamCount} Teams
        </Badge>
        
        {timeslots && timeslots.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {timeslots.join(' / ')}
          </div>
        )}
      </div>
    </div>
  );
};
