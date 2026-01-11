import { AlertTriangle, Info } from 'lucide-react';
import React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { DualBlockValidationResult } from '@/utils/autoSchedule/dualBlock/types';

interface DualMatchWarningDisplayProps {
  validation?: DualBlockValidationResult;
  duplicateOpponentsCount?: number;
  teamsInBothBlocks?: number;
  totalTeams?: number;
}

const DualMatchWarningDisplay: React.FC<DualMatchWarningDisplayProps> = ({
  validation,
  duplicateOpponentsCount = 0,
  teamsInBothBlocks = 0,
  totalTeams = 0,
}) => {
  const { isWinterTheme } = useSeasonalThemeBase();
  // No issues to display
  if (!validation && duplicateOpponentsCount === 0) {
    return null;
  }

  const hasDuplicates =
    duplicateOpponentsCount > 0 || (validation?.teamsWithDuplicateOpponents?.length || 0) > 0;

  const hasOverbooked = (validation?.overbookedTeams?.length || 0) > 0;

  // If no issues found and all teams in both blocks, show success
  if (!hasDuplicates && !hasOverbooked && teamsInBothBlocks === totalTeams && totalTeams > 0) {
    return (
      <Alert
        className={`mt-4 ${
          isWinterTheme
            ? 'border-green-500/40 bg-green-900/20'
            : 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
        }`}
      >
        <Info className="h-4 w-4 text-green-500" />
        <AlertTitle>Optimal Dual Match Schedule</AlertTitle>
        <AlertDescription>
          All teams have matches in both time blocks with different opponents.
        </AlertDescription>
      </Alert>
    );
  }

  // If there are issues, show warnings
  const getAlertClasses = () => {
    if (isWinterTheme) {
      return hasDuplicates
        ? 'border-amber-500/40 bg-amber-900/20'
        : 'border-[hsl(199,60%,40%,0.3)] bg-[hsl(222,30%,15%)]';
    }
    return hasDuplicates
      ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
      : 'border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20';
  };

  return (
    <Alert className={`mt-4 ${getAlertClasses()}`}>
      {hasDuplicates ? (
        <AlertTriangle className="h-4 w-4 text-amber-500" />
      ) : (
        <Info className="h-4 w-4 text-blue-500" />
      )}

      <AlertTitle>
        {hasDuplicates ? 'Duplicate Opponents Detected' : 'Dual Match Schedule Information'}
      </AlertTitle>

      <AlertDescription className="space-y-2">
        {hasDuplicates && (
          <p>
            {duplicateOpponentsCount || validation?.teamsWithDuplicateOpponents?.length || 0}{' '}
            team(s) will face the same opponent in both time blocks.
          </p>
        )}

        {teamsInBothBlocks < totalTeams && (
          <p>
            {teamsInBothBlocks} out of {totalTeams} teams have matches in both time blocks.{' '}
            {totalTeams - teamsInBothBlocks} team(s) only play in one time block.
          </p>
        )}

        {hasOverbooked && (
          <p className="text-red-600 dark:text-red-400 font-medium">
            {validation?.overbookedTeams?.length} team(s) are scheduled for overlapping time slots.
          </p>
        )}

        {validation?.warnings?.length ? (
          <div className="mt-2">
            <p className="font-medium">Warnings:</p>
            <ul className="list-disc pl-5 text-sm">
              {validation.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </AlertDescription>
    </Alert>
  );
};

export default DualMatchWarningDisplay;
