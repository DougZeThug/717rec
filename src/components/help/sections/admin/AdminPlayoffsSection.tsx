import { Trophy } from 'lucide-react';
import React from 'react';

import { HelpAccordionItem } from '../../HelpAccordionItem';

export const AdminPlayoffsSection: React.FC = () => {
  return (
    <HelpAccordionItem value="admin-playoffs" icon={Trophy} title="Managing Playoffs">
      <ol className="list-decimal pl-5 space-y-3">
        <li>
          <strong>Create Bracket:</strong> From the Playoffs page, create a new bracket for a
          division.
        </li>
        <li>
          <strong>Seed Teams:</strong> Auto-seed by standings or manually assign seeds.
        </li>
        <li>
          <strong>Update Scores:</strong> Click on matches to enter results and advance winners.
        </li>
      </ol>
    </HelpAccordionItem>
  );
};
