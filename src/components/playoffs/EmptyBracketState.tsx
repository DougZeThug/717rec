import { Plus, Trophy } from 'lucide-react';
import React from 'react';

import { EmptyState } from '@/components/ui/empty-state';

interface EmptyBracketStateProps {
  onCreateBracket: () => void;
}

const EmptyBracketState: React.FC<EmptyBracketStateProps> = ({ onCreateBracket }) => {
  return (
    <EmptyState
      icon={Trophy}
      title="No Playoff Brackets"
      description="Create playoff brackets to organize your tournament and determine the champion."
      actions={[
        {
          label: 'Create Bracket',
          onClick: onCreateBracket,
          icon: Plus,
        },
      ]}
      className="bg-card rounded-lg border border-border shadow-sm"
    />
  );
};

export default EmptyBracketState;
