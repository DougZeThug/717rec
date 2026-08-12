import { BarChart3 } from 'lucide-react';
import React from 'react';

import { HelpAccordionItem } from '../HelpAccordionItem';

export const StandingsSection: React.FC = () => {
  return (
    <HelpAccordionItem value="standings" icon={BarChart3} title="Viewing Standings & Stats">
      <p>The Standings page shows team rankings based on wins, losses, and power scores.</p>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <strong>Power Score:</strong> A 0-100 rating built from three parts &mdash; 40% match win
          rate, 45% strength of schedule, and 15% game win rate. Wins and games are weighted by the
          division of the opponent you played, so beating a stronger team is worth more than beating
          a weaker one.
        </li>
        <li>
          <strong>SOS (Strength of Schedule):</strong> The average division strength of the
          opponents you have faced. A harder schedule raises your Power Score, which is why two
          teams with the same record can be ranked differently.
        </li>
        <li>
          <strong>Game Differential:</strong> Total games won minus games lost.
        </li>
      </ul>
      <p>
        Click on any team to view their detailed stats, match history, and head-to-head records.
      </p>
    </HelpAccordionItem>
  );
};
