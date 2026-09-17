import { AlertTriangle, Info } from 'lucide-react';
import React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { RecapFactsV1 } from '@/types/recapEdition';

/**
 * Everything the admin should know before publishing this week.
 *
 * These exist because a published edition is frozen: a wrong number stays wrong
 * for good. Each one names the specific problem rather than a generic warning,
 * so the admin can decide rather than guess.
 */
const PackWarnings: React.FC<{ facts: RecapFactsV1 }> = ({ facts }) => {
  const warnings: Array<{ title: string; body: string; blocking: boolean }> = [];

  if (facts.movers.basis === 'missing') {
    warnings.push({
      blocking: true,
      title: `No power score snapshot for week ${facts.weekNumber}`,
      body: 'The weekly snapshot job has not run for this week, so movers, Team of the Week and the standings columns cannot be trusted. Run the capture-power-snapshots function, then generate again.',
    });
  }

  if (facts.movers.basis === 'gap' && facts.movers.previousWeek !== null) {
    warnings.push({
      blocking: false,
      title: `Compared against week ${facts.movers.previousWeek}`,
      body: `Week ${facts.weekNumber - 1} has no snapshot, so this week's movement is measured from week ${facts.movers.previousWeek} instead. The numbers are real, but they cover more than one week.`,
    });
  }

  if (facts.movers.basis === 'baseline') {
    warnings.push({
      blocking: false,
      title: 'Nothing to compare against yet',
      body: 'This is the first week with a snapshot, so there are no movers and no Team of the Week.',
    });
  }

  if (facts.unresolvedMatchCount > 0) {
    warnings.push({
      blocking: false,
      title: `${facts.unresolvedMatchCount} match${facts.unresolvedMatchCount === 1 ? '' : 'es'} still have no result`,
      body: 'Publishing now describes the week as finished. Enter the missing scores first if you want the recap to be complete.',
    });
  }

  if (warnings.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {warnings.map((warning) => (
        <Alert key={warning.title} variant={warning.blocking ? 'destructive' : 'default'}>
          {warning.blocking ? <AlertTriangle className="size-4" /> : <Info className="size-4" />}
          <AlertTitle>{warning.title}</AlertTitle>
          <AlertDescription>{warning.body}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
};

export default PackWarnings;
