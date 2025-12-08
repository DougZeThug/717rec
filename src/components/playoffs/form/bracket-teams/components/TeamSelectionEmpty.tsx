import React from 'react';
import { Users, Plus, FolderOpen } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useNavigate } from 'react-router-dom';

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
      description="No teams exist in this division. Add teams first, or try selecting a different division."
      actions={[
        {
          label: "Manage Teams",
          onClick: () => navigate("/admin"),
          icon: Plus,
          variant: "default",
        },
        {
          label: "View Teams",
          onClick: () => navigate("/teams"),
          icon: FolderOpen,
          variant: "outline",
        },
      ]}
      className="border border-border rounded-lg"
    />
  );
};
