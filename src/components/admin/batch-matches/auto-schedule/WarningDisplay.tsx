
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface WarningDisplayProps {
  oddBlocks?: number;
  unmatchedTeams?: number;
  insufficientBlocks?: string[];
  onSuggestionClick?: (blockId: string) => void;
}

export const WarningDisplay: React.FC<WarningDisplayProps> = ({
  oddBlocks = 0,
  unmatchedTeams = 0,
  insufficientBlocks = [],
  onSuggestionClick
}) => {
  if (oddBlocks === 0 && unmatchedTeams === 0 && insufficientBlocks.length === 0) {
    return null;
  }

  return (
    <Alert className="mt-4 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertTitle>Odd number of teams detected</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          Some time blocks have an odd number of teams. This means not all teams can be paired 
          for matches.
        </p>
        
        {unmatchedTeams > 0 && (
          <p>
            <strong>{unmatchedTeams} team{unmatchedTeams !== 1 ? 's' : ''}</strong> will not 
            have a match in the current schedule.
          </p>
        )}
        
        {insufficientBlocks.length > 0 && (
          <div className="mt-2">
            <p>These blocks don't have enough teams to create matches:</p>
            <ul className="list-disc pl-5 mt-1">
              {insufficientBlocks.map(block => (
                <li key={block}>{block} Block</li>
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
