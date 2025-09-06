
import React from "react";
import { Match } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import TeamGameScoreRow from "./TeamGameScoreRow";

interface MatchListProps {
  matches: Match[];
  isLoading?: boolean;
  teamId: string;
  title?: string;
  isPast?: boolean;
  highlightWinnerLoser?: boolean; // new prop to explicitly turn on highlight
  collapsible?: boolean; // new prop to make it collapsible
  defaultOpen?: boolean; // control initial state
}

const MatchList: React.FC<MatchListProps> = ({
  matches,
  isLoading,
  teamId,
  title = "Match History",
  isPast = true,
  highlightWinnerLoser = false,
  collapsible = false,
  defaultOpen = true
}) => {
  const matchContent = (
    <>
      {isLoading ? (
        <Skeleton className="h-32 w-full rounded mb-4" />
      ) : matches.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm py-6">No matches found.</div>
      ) : (
        <div className="divide-y divide-border rounded-lg border bg-card shadow-sm overflow-hidden">
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
      <div className="mt-10">
        <Accordion type="single" collapsible defaultValue={defaultOpen ? "matches" : undefined}>
          <AccordionItem value="matches" className="border-none">
            <AccordionTrigger className="text-lg sm:text-xl font-semibold hover:no-underline">
              {title}
            </AccordionTrigger>
            <AccordionContent className="pt-3">
              {matchContent}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    );
  }

  return (
    <div className="mt-10">
      {title && (
        <h2 className="text-lg sm:text-xl font-semibold mb-3">{title}</h2>
      )}
      {matchContent}
    </div>
  );
};

export default MatchList;
