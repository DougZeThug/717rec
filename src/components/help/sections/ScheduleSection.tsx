import React from "react";
import { Calendar } from "lucide-react";
import { HelpAccordionItem } from "../HelpAccordionItem";

export const ScheduleSection: React.FC = () => {
  return (
    <HelpAccordionItem value="schedule" icon={Calendar} title="Understanding the Schedule">
      <p>
        The Schedule page displays all matches organized by date and
        round.
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Filter by division or specific weeks</li>
        <li>View match times and locations</li>
        <li>See completed match scores</li>
        <li>Track upcoming matchups</li>
      </ul>
    </HelpAccordionItem>
  );
};
