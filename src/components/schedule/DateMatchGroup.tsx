
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
      className="mb-4 border rounded-lg overflow-hidden"
      style={isLight ? { borderColor: "#e5e7eb" } : { borderColor: "#2d2d2d" }}
    >
      <CollapsibleTrigger 
        className={cn(
          "flex w-full items-center justify-between p-4 text-left font-semibold text-lg focus:outline-none",
          isLight ? "bg-gray-50 text-gray-900" : "bg-gray-800 text-white",
          isCompleted ? (isLight ? "bg-green-50" : "bg-green-900/20") : ""
        )}
        aria-expanded={isOpen}
        aria-controls={`content-${formattedDate}`}
      >
        <span>{formattedDate}</span>
        <ChevronDown 
          className={cn(
            "h-5 w-5 transition-transform duration-200",
            isOpen ? "transform rotate-180" : ""
          )} 
        />
      </CollapsibleTrigger>
      <CollapsibleContent id={`content-${formattedDate}`}>
        <div className="p-4">
          {matches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matches.map(match => (
                <MatchCard 
                  key={match.id} 
                  match={match}
                  isCompleted={match.iscompleted}
                  onEdit={!match.iscompleted ? onEditMatch : undefined}
                  onDelete={!match.iscompleted ? onDeleteMatch : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <CalendarX className="mx-auto h-12 w-12 text-gray-400 mb-2" />
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
