import { PlusCircle, Trophy } from 'lucide-react';
import React from 'react';

import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayoffBracket } from '@/types';

import DivisionBracketsCard from './DivisionBracketsCard';
import DivisionProjectedSeeds from './DivisionProjectedSeeds';

interface BracketListProps {
  divisions: string[];
  bracketsByDivision: Record<string, PlayoffBracket[]>;
  onCreateBracket?: () => void;
  onViewBracket: (id: string) => void;
  onDeleteBracket?: (id: string, name: string) => void;
  isLoading: boolean;
  /**
   * The season on screen. Feeds the projected seeds an empty division shows in
   * place of "No brackets yet". Pass `null` to leave that card as it was — the
   * views do that while a bracket is open, so nothing fetches behind it.
   */
  seasonId?: string | null;
}

const BracketList: React.FC<BracketListProps> = ({
  divisions,
  bracketsByDivision,
  onCreateBracket,
  onViewBracket,
  onDeleteBracket,
  isLoading,
  seasonId = null,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {['bracket-skel-1', 'bracket-skel-2', 'bracket-skel-3'].map((sk) => (
          <Skeleton key={sk} className="h-40 w-full rounded-xl" />
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
          onDeleteBracket={onDeleteBracket}
          // An element, not a rendered tree: the card only renders it when the
          // division has no brackets, so the seeds hook — and the three queries
          // behind it — never mount for a division that already has one.
          emptyStateSlot={<DivisionProjectedSeeds division={division} seasonId={seasonId} />}
        />
      ))}
    </div>
  );
};

export default BracketList;
