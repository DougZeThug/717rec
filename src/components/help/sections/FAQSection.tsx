import React from "react";
import { HelpCircle } from "lucide-react";
import { HelpAccordionItem } from "../HelpAccordionItem";

export const FAQSection: React.FC = () => {
  return (
    <HelpAccordionItem value="faq" icon={HelpCircle} title="Frequently Asked Questions">
      <div>
        <p className="font-medium">
          How is the Power Score calculated?
        </p>
        <p className="text-muted-foreground mt-1">
          Power Score combines win percentage (70%) and strength of
          schedule (30%) to create a balanced ranking metric.
        </p>
      </div>
      <div>
        <p className="font-medium">
          What does SOS (Strength of Schedule) mean?
        </p>
        <p className="text-muted-foreground mt-1">
          SOS measures the average win percentage of all opponents
          you've faced. A higher SOS means you've played tougher
          competition.
        </p>
      </div>
      <div>
        <p className="font-medium">How do playoff seeds work?</p>
        <p className="text-muted-foreground mt-1">
          Seeds are typically based on regular season standings or
          power rankings. Higher seeds get favorable bracket
          positions.
        </p>
      </div>
      <div>
        <p className="font-medium">
          Can I see my team's historical performance?
        </p>
        <p className="text-muted-foreground mt-1">
          Yes! Visit the History page to view past seasons, or check
          your team's page for career statistics.
        </p>
      </div>
    </HelpAccordionItem>
  );
};
