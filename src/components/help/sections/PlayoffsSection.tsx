import { Trophy } from 'lucide-react';
import React from 'react';

import { HelpAccordionItem } from '../HelpAccordionItem';

export const PlayoffsSection: React.FC = () => {
  return (
    <HelpAccordionItem value="playoffs" icon={Trophy} title="Playoff Brackets">
      <p>The Playoffs page shows tournament brackets for each division.</p>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <strong>Double Elimination:</strong> Teams must lose twice to be eliminated
        </li>
        <li>
          <strong>Winners Bracket:</strong> Teams with no losses
        </li>
        <li>
          <strong>Losers Bracket:</strong> Teams fighting back after one loss
        </li>
        <li>
          <strong>Grand Finals:</strong> Championship match between bracket winners
        </li>
      </ul>
    </HelpAccordionItem>
  );
};
