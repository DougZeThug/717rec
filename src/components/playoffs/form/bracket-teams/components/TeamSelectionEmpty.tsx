import { FolderOpen, Plus, Users } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router';

import { EmptyState } from '@/components/ui/empty-state';

/**
 * Empty state component for team selection
 * Displayed when no teams are available for selection
 */
export const TeamSelectionEmpty: React.FC = () => {
  const navigate = useNavigate();

  return (
    <EmptyState
      icon={Users}
      title="No Teams Available"
      description="No teams are currently available for bracket creation. Please add teams to a division first."
      actions={[
        {
          label: 'Manage Teams',
          onClick: () => navigate('/admin'),
          icon: Plus,
          variant: 'default',
        },
        {
          label: 'View Teams',
          onClick: () => navigate('/teams'),
          icon: FolderOpen,
          variant: 'outline',
        },
      ]}
      className="border border-border rounded-lg"
    />
  );
};
