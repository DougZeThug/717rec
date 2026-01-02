import React from "react";
import { BarChart3 } from "lucide-react";
import { HelpAccordionItem } from "../HelpAccordionItem";

export const StandingsSection: React.FC = () => {
  return (
    <HelpAccordionItem value="standings" icon={BarChart3} title="Viewing Standings & Stats">
      <p>
        The Standings page shows team rankings based on wins, losses,
        and power scores.
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <strong>Power Score:</strong> A composite ranking that
          factors in win percentage and strength of schedule.
        </li>
        <li>
          <strong>SOS (Strength of Schedule):</strong> Measures the
          difficulty of opponents faced.
        </li>
        <li>
          <strong>Game Differential:</strong> Total games won minus
          games lost.
        </li>
      </ul>
      <p>
        Click on any team to view their detailed stats, match history,
        and head-to-head records.
      </p>
    </HelpAccordionItem>
  );
};
