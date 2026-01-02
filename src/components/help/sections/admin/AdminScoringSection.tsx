import React from "react";
import { ListChecks } from "lucide-react";
import { HelpAccordionItem } from "../../HelpAccordionItem";

export const AdminScoringSection: React.FC = () => {
  return (
    <HelpAccordionItem value="admin-scoring" icon={ListChecks} title="Recording Scores">
      <ol className="list-decimal pl-5 space-y-3">
        <li>
          <strong>Mass Scores:</strong> Use the Scores tab to
          enter multiple match results at once.
        </li>
        <li>
          <strong>Individual Games:</strong> Enter game-by-game
          scores for best-of series.
        </li>
        <li>
          <strong>Pending Scores:</strong> Review and approve
          player-submitted scores in the Pending tab.
        </li>
      </ol>
      <p className="text-muted-foreground">
        Tip: Scores automatically update team stats and standings.
      </p>
    </HelpAccordionItem>
  );
};
