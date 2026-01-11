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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Playoff Brackets</h2>
        {onCreateBracket && (
          <Button onClick={onCreateBracket} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Create Bracket
          </Button>
        )}
      </div>

      {divisions.length === 0 ? (
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
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
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
      )}
    </div>
  );
};

export default BracketList;
