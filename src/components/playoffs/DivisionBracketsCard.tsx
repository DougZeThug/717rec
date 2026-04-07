import { Plus, Trophy } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PlayoffBracket } from '@/types';
import { bracketLog } from '@/utils/logger';

interface DivisionBracketsCardProps {
  division: string;
  brackets: Array<Partial<PlayoffBracket>>;
  onViewBracket?: (bracketId: string) => void;
  onCreateBracket?: () => void;
  onEditBracket?: () => void;
  onDeleteBracket?: (id: string, name: string) => void;
}

const getDivisionBorderColor = (division: string): string => {
  const d = division.toLowerCase();
  if (d.includes('competitive')) return 'border-l-[hsl(var(--competitive))]';
  if (d.includes('intermediate')) return 'border-l-[hsl(var(--intermediate))]';
  if (d.includes('recreational')) return 'border-l-[hsl(var(--recreational))]';
  return 'border-l-muted-foreground';
};

const getDivisionTextColor = (division: string): string => {
  const d = division.toLowerCase();
  if (d.includes('competitive')) return 'text-[hsl(var(--competitive))]';
  if (d.includes('intermediate')) return 'text-[hsl(var(--intermediate))]';
  if (d.includes('recreational')) return 'text-[hsl(var(--recreational))]';
  return 'text-muted-foreground';
};

const getDivisionButtonClass = (division: string): string => {
  const d = division.toLowerCase();
  if (d.includes('competitive'))
    return 'bg-[hsl(var(--competitive))] hover:bg-[hsl(var(--competitive)/0.9)] text-white';
  if (d.includes('intermediate'))
    return 'bg-[hsl(var(--intermediate))] hover:bg-[hsl(var(--intermediate)/0.9)] text-white';
  if (d.includes('recreational'))
    return 'bg-[hsl(var(--recreational))] hover:bg-[hsl(var(--recreational)/0.9)] text-white';
  return 'bg-primary hover:bg-primary/90 text-primary-foreground';
};

const DivisionBracketsCard: React.FC<DivisionBracketsCardProps> = ({
  division,
  brackets,
  onCreateBracket,
  onViewBracket,
  onDeleteBracket,
}) => {
  const handleViewBracket = (bracketId: string) => {
    bracketLog('View bracket clicked for ID:', bracketId);
    onViewBracket(bracketId);
  };

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
        <Trophy className={cn('h-5 w-5 shrink-0', getDivisionTextColor(division))} />
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
              <div
                key={bracket.id}
                className="flex flex-col gap-2.5 py-2 border-b border-border/30 last:border-0 last:pb-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground truncate">
                        {bracket.name}
                      </span>
                      {!bracket.uses_brackets_manager && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          Legacy
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{bracket.format}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  {onViewBracket && (
                    <Button
                      size="sm"
                      className={cn('flex-1 text-xs h-8', getDivisionButtonClass(division))}
                      onClick={() => handleViewBracket(bracket.id!)}
                    >
                      View Live Bracket
                    </Button>
                  )}
                  {onDeleteBracket && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 text-destructive hover:text-destructive"
                      onClick={() => onDeleteBracket(bracket.id!, bracket.name!)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-5 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2.5">
              <Trophy className={cn('h-5 w-5', getDivisionTextColor(division))} />
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
                <Plus className="h-3.5 w-3.5" /> Create Bracket
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DivisionBracketsCard;
