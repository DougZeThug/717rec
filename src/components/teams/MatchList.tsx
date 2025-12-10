import React, { useState } from "react";
import { Match } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { History, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import TeamGameScoreRow from "./TeamGameScoreRow";

interface MatchListProps {
  matches: Match[];
  isLoading?: boolean;
  teamId: string;
  title?: string;
  isPast?: boolean;
  highlightWinnerLoser?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

const MatchList: React.FC<MatchListProps> = ({
  matches,
  isLoading,
  teamId,
  title = "Current Season Match History",
  isPast = true,
  highlightWinnerLoser = false,
  collapsible = false,
  defaultOpen = true
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const matchContent = (
    <>
      {isLoading ? (
        <Skeleton className="h-32 w-full rounded" />
      ) : matches.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm py-6">No matches found.</div>
      ) : (
        <div className="divide-y divide-border">
          {matches.map((match) => (
            <TeamGameScoreRow
              key={match.id}
              match={match}
              teamId={teamId}
              highlightWinnerLoser={highlightWinnerLoser}
            />
          ))}
        </div>
      )}
    </>
  );

  if (collapsible && title) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="border rounded-lg bg-card shadow-sm">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 md:p-4 hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
              <h2 className="font-bebas text-lg md:text-xl tracking-wide uppercase bg-gradient-to-r from-blue-800 via-blue-700 to-amber-700 dark:from-blue-400 dark:to-amber-400 bg-clip-text text-transparent">
                {title}
              </h2>
            </div>
            <ChevronDown className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-3 md:p-4 pt-0 border-t">
              {matchContent}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  return (
    <div>
      {title && (
        <h2 className="text-lg sm:text-xl font-semibold mb-3">{title}</h2>
      )}
      {matchContent}
    </div>
  );
};

export default MatchList;
