import { PlusCircle, Trophy } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayoffBracket } from '@/types';

import DivisionBracketsCard from './DivisionBracketsCard';

interface BracketListProps {
  divisions: string[];
  bracketsByDivision: Record<string, PlayoffBracket[]>;
  onCreateBracket?: () => void;
  onViewBracket: (id: string) => void;
  onEditBracket?: () => void;
  onDeleteBracket?: (id: string, name: string) => void;
  isLoading: boolean;
}

const BracketList: React.FC<BracketListProps> = ({
  divisions,
  bracketsByDivision,
  onCreateBracket,
  onViewBracket,
  onEditBracket,
  onDeleteBracket,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (divisions.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No Playoff Brackets Yet"
        description={
          onCreateBracket
            ? 'Get started by creating your first playoff bracket for the season.'
            : "Playoff brackets will appear here once they're created. Check back during playoff season!"
        }
        actions={
          onCreateBracket
            ? [
                {
                  label: 'Create First Bracket',
                  onClick: onCreateBracket,
                  variant: 'default',
                  icon: PlusCircle,
                },
              ]
            : []
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {divisions.map((division) => (
        <DivisionBracketsCard
          key={division}
          division={division}
          brackets={bracketsByDivision[division] || []}
          onViewBracket={onViewBracket}
          onCreateBracket={onCreateBracket}
          onEditBracket={onEditBracket}
          onDeleteBracket={onDeleteBracket}
        />
      ))}
    </div>
  );
};

export default BracketList;
