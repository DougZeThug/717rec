import { AlertTriangle, Clock } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ScoreSubmission } from '@/hooks/useScoreSubmissions';

import ScoreSubmissionCard from './ScoreSubmissionCard';

interface ScoreSubmissionsListProps {
  submissions: ScoreSubmission[];
  onApprove: (submission: ScoreSubmission) => void;
  onReject: (submissionId: string) => void;
}

interface MatchGroup {
  key: string;
  submissions: ScoreSubmission[];
}

/**
 * Puts every report for one match together, keeping the order the reports
 * arrived in (newest first) and the order the matches first appear.
 *
 * Two people reporting the same match used to render as two unrelated cards
 * further apart the busier the night was, so an admin could approve one without
 * ever seeing the other (UX audit A-10). A report with no match id cannot be
 * grouped with anything, so it gets a group of its own.
 */
const groupByMatch = (submissions: ScoreSubmission[]): MatchGroup[] => {
  const groups: MatchGroup[] = [];
  const byKey = new Map<string, MatchGroup>();

  for (const submission of submissions) {
    const key = submission.match_id ?? `ungrouped-${submission.id}`;
    const existing = byKey.get(key);

    if (existing) {
      existing.submissions.push(submission);
      continue;
    }

    const group: MatchGroup = { key, submissions: [submission] };
    byKey.set(key, group);
    groups.push(group);
  }

  return groups;
};

const matchLabel = (submission: ScoreSubmission): string => {
  const team1Name = submission.match?.team1?.name;
  const team2Name = submission.match?.team2?.name;
  return team1Name && team2Name ? `${team1Name} vs ${team2Name}` : 'this match';
};

const ScoreSubmissionsList = ({ submissions, onApprove, onReject }: ScoreSubmissionsListProps) => {
  /**
   * The id of the report the confirmation is open for, not the report itself.
   *
   * The queue is refetched on mount and on every window focus, and two admins
   * can work it at once. A copy of the row held here goes stale the moment
   * either happens: the card leaves the list while the confirmation stays open
   * naming it, and pressing "Reject report" then fires at a report this admin's
   * own screen has already dropped.
   *
   * Holding the id and reading the row back out of `submissions` keeps the two
   * in step without an effect: the dialog is opened by the derived row, so a
   * report that has left the queue closes it on the same render that drops the
   * card. The id can outlive the row — the empty-state return below sits above
   * the dialog and unmounts it — but it only ever reopens the confirmation for a
   * report that is in the queue and still waiting, which is a confirmation that
   * is true.
   */
  const [pendingRejectId, setPendingRejectId] = useState<string | null>(null);
  const groups = useMemo(() => groupByMatch(submissions), [submissions]);
  const pendingReject = pendingRejectId
    ? (submissions.find((submission) => submission.id === pendingRejectId) ?? null)
    : null;

  const openRejectFor = useCallback(
    (submission: ScoreSubmission) => setPendingRejectId(submission.id),
    []
  );

  if (submissions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Clock className="size-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No score reports waiting for approval.</p>
        </CardContent>
      </Card>
    );
  }

  const confirmReject = () => {
    // Reads the derived row, not the id: a report that has gone leaves this
    // null, and the press must then do nothing at all.
    if (!pendingReject) {
      setPendingRejectId(null);
      return;
    }
    onReject(pendingReject.id);
    setPendingRejectId(null);
  };

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.key} className="space-y-4">
          {group.submissions.length > 1 && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p>
                <strong>
                  {group.submissions.length} reports for {matchLabel(group.submissions[0])}.
                </strong>{' '}
                Read all of them before you approve one — a report is a message, not a score, so
                they may not agree.
              </p>
            </div>
          )}

          {group.submissions.map((submission) => (
            <ScoreSubmissionCard
              key={submission.id}
              submission={submission}
              onApprove={onApprove}
              onReject={openRejectFor}
            />
          ))}
        </div>
      ))}

      <ConfirmDialog
        open={pendingReject !== null}
        onOpenChange={() => setPendingRejectId(null)}
        title="Reject this score report?"
        description={
          <>
            This throws away the report from{' '}
            <strong>{pendingReject?.submitter_name ?? 'this submitter'}</strong> for{' '}
            <strong>{pendingReject ? matchLabel(pendingReject) : 'this match'}</strong>. The match
            keeps whatever result it has now, and the report cannot be brought back.
          </>
        }
        onConfirm={confirmReject}
        confirmLabel="Reject report"
        pendingLabel="Rejecting..."
      />
    </div>
  );
};

export default ScoreSubmissionsList;
