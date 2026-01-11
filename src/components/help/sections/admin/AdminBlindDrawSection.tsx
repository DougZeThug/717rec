import { Shuffle } from 'lucide-react';
import React from 'react';

import { HelpAccordionItem } from '../../HelpAccordionItem';

export const AdminBlindDrawSection: React.FC = () => {
  return (
    <HelpAccordionItem value="admin-blind-draw" icon={Shuffle} title="Blind Draw Events">
      <p>Blind draw events randomly pair players for casual tournaments.</p>
      <ul className="list-disc pl-5 space-y-2">
        <li>View signups for upcoming blind draw dates</li>
        <li>Manage participant lists</li>
        <li>Export data for pairing</li>
      </ul>
    </HelpAccordionItem>
  );
};
