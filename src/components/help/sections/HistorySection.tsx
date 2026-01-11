import { Clock } from 'lucide-react';
import React from 'react';

import { HelpAccordionItem } from '../HelpAccordionItem';

export const HistorySection: React.FC = () => {
  return (
    <HelpAccordionItem value="history" icon={Clock} title="League History">
      <p>The History page preserves the legacy of past seasons, including:</p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Past season champions and runners-up</li>
        <li>Historical standings and records</li>
        <li>Career statistics across seasons</li>
      </ul>
    </HelpAccordionItem>
  );
};
