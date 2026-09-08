import { BarChart3 } from 'lucide-react';
import React from 'react';

import { PowerScoreExplainer } from '@/components/stats/PowerScoreExplainer';

import { HelpAccordionItem } from '../HelpAccordionItem';

export const StandingsSection: React.FC = () => {
  return (
    <HelpAccordionItem value="standings" icon={BarChart3} title="Viewing Standings & Stats">
      <p>The Standings page shows team rankings based on wins, losses, and power scores.</p>
      <PowerScoreExplainer />
      <p>
        Click on any team to view their detailed stats, match history, and head-to-head records.
      </p>
    </HelpAccordionItem>
  );
};
