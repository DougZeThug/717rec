import { Plus, Trophy } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BRACKET_STATES } from '@/constants/brackets';
import { cn } from '@/lib/utils';
import { PlayoffBracket } from '@/types';
import { getDivisionSoftClasses } from '@/utils/colors/divisionColors';
import { bracketLog } from '@/utils/logger';

interface DivisionBracketsCardProps {
  division: string;
  brackets: Array<Partial<PlayoffBracket>>;
  onViewBracket?: (bracketId: string) => void;
  onCreateBracket?: () => void;
  onDeleteBracket?: (id: string, name: string) => void;
}

const getDivisionBorderColor = (division: string): string =>
  getDivisionSoftClasses(division).borderLeft;

const getDivisionTextColor = (division: string): string => getDivisionSoftClasses(division).text;

const getDivisionButtonClass = (division: string): string =>
  getDivisionSoftClasses(division).button;

interface BracketTitleProps {
  bracket: Partial<PlayoffBracket>;
  isCompleted: boolean;
}

/** Bracket name plus its status badges. Split out to keep the row's JSX shallow. */
const BracketTitle: React.FC<BracketTitleProps> = ({ bracket, isCompleted }) => (
  <div className="flex items-center gap-2">
    <span className="font-medium text-sm text-foreground truncate">{bracket.name}</span>
    {isCompleted && (
      <Badge variant="secondary" className="text-xs shrink-0">
        Completed
      </Badge>
    )}
    {!bracket.uses_brackets_manager && (
      <Badge variant="secondary" className="text-xs shrink-0">
        Legacy
      </Badge>
    )}
  </div>
);

interface BracketRowProps {
  bracket: Partial<PlayoffBracket>;
  division: string;
  onViewBracket?: (bracketId: string) => void;
  onDeleteBracket?: (id: string, name: string) => void;
}

/** One bracket inside a division card. Split out to keep the card's JSX shallow. */
const BracketRow: React.FC<BracketRowProps> = ({
  bracket,
  division,
  onViewBracket,
  onDeleteBracket,
}) => {
  const isCompleted = bracket.state === BRACKET_STATES.COMPLETED;

  const handleViewBracket = () => {
    if (!bracket.id) return;
    bracketLog('View bracket clicked for ID:', bracket.id);
    onViewBracket?.(bracket.id);
  };

  return (
    <div className="flex flex-col gap-2.5 py-2 border-b border-border/30 last:border-0 last:pb-0">
      {/* Merged with a single-child `flex items-start justify-between` wrapper that
          had no layout effect; stretching to full width keeps `truncate` working. */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <BracketTitle bracket={bracket} isCompleted={isCompleted} />
        <span className="text-xs text-muted-foreground">{bracket.format}</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {onViewBracket && (
          <Button
            size="sm"
            className={cn('flex-1 text-xs h-8', getDivisionButtonClass(division))}
            onClick={handleViewBracket}
          >
            {isCompleted ? 'View Final Results' : 'View Live Bracket'}
          </Button>
        )}
        {onDeleteBracket && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 text-destructive hover:text-destructive"
            onClick={() => bracket.id && onDeleteBracket(bracket.id, bracket.name ?? '')}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
};

const DivisionBracketsCard: React.FC<DivisionBracketsCardProps> = ({
  division,
  brackets,
  onCreateBracket,
  onViewBracket,
  onDeleteBracket,
}) => {
  return (
    <div
      className={cn(
        'rounded-xl border-l-4 bg-card border border-border shadow-sm overflow-hidden',
        'active:scale-[0.99] transition-all duration-200',
        getDivisionBorderColor(division)
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2.5 border-b border-border/50">
        <Trophy className={cn('size-5 shrink-0', getDivisionTextColor(division))} />
        <h3 className={cn('font-semibold text-base', getDivisionTextColor(division))}>
          {division} Division
        </h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {brackets.length
            ? `${brackets.length} bracket${brackets.length > 1 ? 's' : ''}`
            : 'No brackets'}
        </span>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {brackets.length > 0 ? (
          <div className="space-y-3">
            {brackets.map((bracket) => (
              <BracketRow
                key={bracket.id}
                bracket={bracket}
                division={division}
                onViewBracket={onViewBracket}
                onDeleteBracket={onDeleteBracket}
              />
            ))}
            {/* A division can hold more than one bracket, so the control stays
                available once the first one exists. */}
            {onCreateBracket && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs w-full"
                onClick={() => {
                  bracketLog('Create bracket button clicked for division:', division);
                  onCreateBracket();
                }}
              >
                <Plus className="size-3.5" /> Create Bracket
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-5 text-center">
            <div
              className={cn(
                'size-10 rounded-full flex items-center justify-center mb-2.5',
                getDivisionSoftClasses(division).iconBg
              )}
            >
              <Trophy className={cn('size-5', getDivisionTextColor(division))} />
            </div>
            <p className="text-sm text-muted-foreground mb-3">No brackets yet for this division</p>
            {onCreateBracket && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => {
                  bracketLog('Create bracket button clicked for division:', division);
                  onCreateBracket();
                }}
              >
                <Plus className="size-3.5" /> Create Bracket
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DivisionBracketsCard;
