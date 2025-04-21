
import React from "react";
import { format } from "date-fns";
import { CalendarX, ChevronDown } from "lucide-react";
import { Match } from "@/types";
import MatchCard from "./MatchCard";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface DateMatchGroupProps {
  date: Date;
  matches: Match[];
  isCurrentDay: boolean;
  onEditMatch?: (match: Match) => void;
  onDeleteMatch?: (matchId: string) => void;
}

const DateMatchGroup: React.FC<DateMatchGroupProps> = ({ 
  date, 
  matches, 
  isCurrentDay,
  onEditMatch,
  onDeleteMatch
}) => {
  const [isOpen, setIsOpen] = React.useState(isCurrentDay);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  
  const formattedDate = format(date, "EEEE, MMMM d");
  const isCompleted = matches.every(match => match.iscompleted);
  
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="mb-4 overflow-hidden font-inter"
    >
      <CollapsibleTrigger 
        className={cn(
          "flex w-full items-center justify-between p-4 text-left font-semibold text-sm rounded-t transition-all",
          isLight 
            ? "bg-gray-50 text-gray-700 shadow-sm border-b border-gray-200" 
            : "bg-gray-800 text-white border-gray-700",
          isCompleted 
            ? isLight 
              ? "bg-green-50/50 border-green-100" 
              : "bg-green-900/20 border-green-800/30" 
            : ""
        )}
        aria-expanded={isOpen}
        aria-controls={`content-${formattedDate}`}
      >
        <span>{formattedDate}</span>
        <ChevronDown 
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen ? "transform rotate-180" : ""
          )} 
        />
      </CollapsibleTrigger>
      <CollapsibleContent id={`content-${formattedDate}`}>
        <div className="p-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {matches.length > 0 ? (
            matches.map(match => (
              <MatchCard 
                key={match.id} 
                match={match}
                isCompleted={match.iscompleted}
                onEdit={!match.iscompleted ? onEditMatch : undefined}
                onDelete={!match.iscompleted ? onDeleteMatch : undefined}
              />
            ))
          ) : (
            <div className="col-span-full py-8 text-center">
              <CalendarX className={cn(
                "mx-auto h-12 w-12 mb-2",
                isLight ? "text-gray-400" : "text-gray-500"
              )} />
              <p className={isLight ? "text-gray-500" : "text-gray-400"}>
                No matches scheduled for this date.
              </p>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default DateMatchGroup;
