import React from "react";
import { Users } from "lucide-react";
import { HelpAccordionItem } from "../HelpAccordionItem";

export const TeamsSection: React.FC = () => {
  return (
    <HelpAccordionItem value="teams" icon={Users} title="Team Pages">
      <p>Each team has a dedicated page showing:</p>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <strong>Stats Tab:</strong> Win/loss record, power score,
          and season performance
        </li>
        <li>
          <strong>Matches Tab:</strong> Complete match history with
          scores
        </li>
        <li>
          <strong>H2H Tab:</strong> Head-to-head records against other
          teams
        </li>
        <li>
          <strong>Achievements Tab:</strong> Awards and milestones
        </li>
      </ul>
    </HelpAccordionItem>
  );
};
