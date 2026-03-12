import { AlertTriangle } from 'lucide-react';
import React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface WarningDisplayProps {
  oddBlocks?: number;
  unmatchedTeams?: number;
  insufficientBlocks?: string[];
  unmatchedTeamDetails?: Array<{ timeBlock: string; team: { id: string; name: string } }>;
  onSuggestionClick?: (blockId: string) => void;
}

export const WarningDisplay: React.FC<WarningDisplayProps> = ({
  oddBlocks = 0,
  unmatchedTeams = 0,
  insufficientBlocks = [],
  unmatchedTeamDetails = [],
  onSuggestionClick: _onSuggestionClick,
}) => {
  if (oddBlocks === 0 && unmatchedTeams === 0 && insufficientBlocks.length === 0) {
    return null;
  }

  return (
    <Alert className="mt-4 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertTitle>
        {unmatchedTeams > 0 ? 'Some teams will be unmatched' : 'Odd number of teams detected'}
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          Some time blocks have an odd number of teams. The auto-scheduler will create matches for
          the maximum number of teams, but {unmatchedTeams} team{unmatchedTeams !== 1 ? 's' : ''}{' '}
          will not be paired.
        </p>

        {unmatchedTeamDetails.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="font-medium">Teams that won't be matched:</p>
            <ul className="list-disc pl-5 text-sm">
              {unmatchedTeamDetails.map((item) => (
                <li key={item.team.id}>
                  <span className="font-medium">{item.team.name}</span>
                  <span className="text-muted-foreground"> in {item.timeBlock}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {insufficientBlocks.length > 0 && (
          <div className="mt-2">
            <p>These blocks don't have enough teams to create matches:</p>
            <ul className="list-disc pl-5 mt-1">
              {insufficientBlocks.map((block) => (
                <li key={block}>{block}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-sm font-medium mt-2">
          Suggestions:
          <ul className="list-disc pl-5 mt-1">
            <li>Add more teams to time blocks with odd numbers</li>
            <li>Move teams between time blocks to balance them</li>
            <li>Continue with the current schedule and some teams will be unmatched</li>
          </ul>
        </div>
      </AlertDescription>
    </Alert>
  );
};
