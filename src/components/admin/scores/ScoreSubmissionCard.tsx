import { CheckCircle, Clock, MessageSquare, Swords, User, Users, XCircle } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScoreSubmission } from '@/hooks/useScoreSubmissions';
import { formatWithPattern } from '@/utils/formatDateSafe';

interface ScoreSubmissionCardProps {
  submission: ScoreSubmission;
  onApprove: (submission: ScoreSubmission) => void;
  onReject: (submission: ScoreSubmission) => void;
}

/** One "Icon Label: value" line. The card is four of these and a message. */
const DetailRow: React.FC<{
  Icon: typeof User;
  label: string;
  children?: React.ReactNode;
}> = ({ Icon, label, children }) => (
  <div className="flex min-w-0 items-center gap-2">
    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    <span className="text-sm text-muted-foreground">{label}</span>
    {children}
  </div>
);

const SubmissionHeader: React.FC = () => (
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle className="text-lg">Score report</CardTitle>
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="size-3" aria-hidden="true" />
        Awaiting approval
      </Badge>
    </div>
  </CardHeader>
);

/** Who sent the report, and which team they said they were on. */
const SubmitterDetails: React.FC<{ submission: ScoreSubmission }> = ({ submission }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <DetailRow Icon={User} label="Submitter:">
      <span className="min-w-0 wrap-break-word font-medium">{submission.submitter_name}</span>
    </DetailRow>

    {submission.submitter_team && (
      <DetailRow Icon={Users} label="Team:">
        <span className="min-w-0 wrap-break-word font-medium">{submission.submitter_team}</span>
      </DetailRow>
    )}
  </div>
);

const SubmissionMessage: React.FC<{ message: string | null }> = ({ message }) => (
  <div className="space-y-2">
    <DetailRow Icon={MessageSquare} label="Message:" />
    <div className="bg-muted/50 p-3 rounded-md">
      <p className="text-sm">{message}</p>
    </div>
  </div>
);

const SubmissionActions: React.FC<{ onApprove: () => void; onReject: () => void }> = ({
  onApprove,
  onReject,
}) => (
  <div className="flex gap-2">
    <Button
      variant="outline"
      size="sm"
      onClick={onReject}
      className="text-destructive-text hover:text-destructive-text"
    >
      <XCircle className="size-4 mr-1" aria-hidden="true" />
      Reject
    </Button>
    <Button size="sm" onClick={onApprove}>
      <CheckCircle className="size-4 mr-1" aria-hidden="true" />
      Approve
    </Button>
  </div>
);

/** Which match this report is about. */
const MatchLine: React.FC<{
  team1Name?: string;
  team2Name?: string;
  matchDate?: string | null;
}> = ({ team1Name, team2Name, matchDate }) => (
  <DetailRow Icon={Swords} label="Match:">
    {/* One flex item: the date follows the names as plain text and never gets squeezed. */}
    <span className="min-w-0 wrap-break-word">
      <span className="font-medium">
        {team1Name && team2Name ? `${team1Name} vs ${team2Name}` : 'Unknown match'}
      </span>
      {matchDate && (
        <span className="ml-2 whitespace-nowrap text-xs text-muted-foreground">
          ({formatWithPattern(matchDate, 'MMM d, yyyy')})
        </span>
      )}
    </span>
  </DetailRow>
);

const ScoreSubmissionCard = ({ submission, onApprove, onReject }: ScoreSubmissionCardProps) => {
  const team1Name = submission.match?.team1?.name;
  const team2Name = submission.match?.team2?.name;
  const matchDate = submission.match?.date;

  return (
    <Card>
      <SubmissionHeader />
      <CardContent className="space-y-4">
        <MatchLine team1Name={team1Name} team2Name={team2Name} matchDate={matchDate} />

        <SubmitterDetails submission={submission} />

        <SubmissionMessage message={submission.message} />

        {/* The date needs 196 to 211px on one line (the widest, "May 30, 2026 at 10:00 AM", is
            211px). Under 512px wide it cannot share the row with the buttons without wrapping
            onto two to four lines, so the buttons drop to their own row there. */}
        <div className="flex items-center justify-between pt-4 border-t max-[512px]:flex-wrap max-[512px]:gap-2">
          <span className="text-xs text-muted-foreground">
            Submitted {formatWithPattern(submission.created_at, "MMM d, yyyy 'at' h:mm a")}
          </span>
          <SubmissionActions
            onApprove={() => onApprove(submission)}
            onReject={() => onReject(submission)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ScoreSubmissionCard;
