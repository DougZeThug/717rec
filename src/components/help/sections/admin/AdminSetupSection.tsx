import { Settings } from 'lucide-react';
import React from 'react';

import { HelpAccordionItem } from '../../HelpAccordionItem';

export const AdminSetupSection: React.FC = () => {
  return (
    <HelpAccordionItem value="admin-setup" icon={Settings} title="Setting Up a Season">
      <ol className="list-decimal pl-5 space-y-3">
        <li>
          <strong>Create a Season:</strong> Go to Admin → Season tab and create a new season with
          start date.
        </li>
        <li>
          <strong>Add Teams:</strong> Use the Teams tab to add teams and assign them to divisions.
        </li>
        <li>
          <strong>Set Up Timeslots:</strong> Define available match times in the Timeslots tab.
        </li>
        <li>
          <strong>Generate Schedule:</strong> Use Auto Schedule to automatically create balanced
          matchups.
        </li>
      </ol>
    </HelpAccordionItem>
  );
};
