import { HelpCircle } from 'lucide-react';
import React from 'react';

import { HelpAccordionItem } from '../HelpAccordionItem';

export const WelcomeSection: React.FC = () => {
  return (
    <HelpAccordionItem value="welcome" icon={HelpCircle} title="Welcome to 717REC">
      <p>
        717REC is your central hub for managing and participating in recreational cornhole leagues.
        Whether you're an admin running the league or a player tracking your team's progress, this
        guide will help you get started.
      </p>
      <div className="grid gap-3">
        <div className="p-3 bg-muted/50 rounded-lg">
          <strong>Public Visitors:</strong> View standings, schedules, team stats, and playoff
          brackets.
        </div>
        <div className="p-3 bg-muted/50 rounded-lg">
          <strong>Players:</strong> Access all public features plus the message board and team
          details.
        </div>
        <div className="p-3 bg-muted/50 rounded-lg">
          <strong>Admins:</strong> Full access to league management including scoring, scheduling,
          and season configuration.
        </div>
      </div>
    </HelpAccordionItem>
  );
};
