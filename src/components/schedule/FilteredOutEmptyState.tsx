import { Filter } from 'lucide-react';
import React from 'react';

import { EmptyState } from '@/components/ui/empty-state';

interface FilteredOutEmptyStateProps {
  onClearFilters?: () => void;
}

/**
 * The list is empty because of a chip, not because the league has nothing on.
 *
 * The ordinary empty states here make a claim about the season — "check back
 * soon for new match schedules", "nothing scheduled for Thu Sep 10" — which
 * would be a lie when the reader's own division or team filter caused it
 * (UX audit SC-02).
 */
export const FilteredOutEmptyState: React.FC<FilteredOutEmptyStateProps> = ({ onClearFilters }) => (
  <EmptyState
    icon={Filter}
    title="No matches match these filters"
    description="Nothing here is in the division or team you picked. Clear the filters to see the whole week."
    actions={
      onClearFilters
        ? [
            {
              label: 'Clear filters',
              onClick: onClearFilters,
              variant: 'default' as const,
              icon: Filter,
            },
          ]
        : []
    }
  />
);
