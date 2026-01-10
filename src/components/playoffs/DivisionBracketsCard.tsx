import { Plus, Trophy } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card key={division}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center">
          <Trophy className="h-5 w-5 mr-2 text-cornhole-wood" />
          {division} Division
        </CardTitle>
        <CardDescription>
          {brackets.length
            ? `${brackets.length} bracket${brackets.length > 1 ? 's' : ''}`
            : 'No brackets'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {brackets.length > 0 ? (
          brackets.map((bracket) => (
            <div
              key={bracket.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{bracket.name}</span>
                  {!bracket.uses_brackets_manager && (
                    <Badge variant="secondary" className="text-xs">
                      Legacy
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{bracket.format}</span>
              </div>
              <div className="flex gap-2">
                {onViewBracket && (
                  <Button size="sm" variant="ghost" onClick={() => handleViewBracket(bracket.id!)}>
                    View
                  </Button>
                )}
                {onDeleteBracket && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => onDeleteBracket(bracket.id!, bracket.name!)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-amber-50 dark:from-blue-900/30 dark:to-amber-900/20 flex items-center justify-center mb-3">
              <Trophy className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">No brackets yet for this division</p>
            {onCreateBracket && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  bracketLog('Create bracket button clicked for division:', division);
                  onCreateBracket();
                }}
              >
                <Plus className="h-4 w-4" /> Create Bracket
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DivisionBracketsCard;
