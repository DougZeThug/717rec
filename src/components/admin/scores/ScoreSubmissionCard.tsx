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

const ScoreSubmissionCard = ({ submission, onApprove, onReject }: ScoreSubmissionCardProps) => {
  const team1Name = submission.match?.team1?.name;
  const team2Name = submission.match?.team2?.name;
  const matchDate = submission.match?.date;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Score report</CardTitle>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="size-3" />
            Awaiting approval
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Which match this report is about */}
        <div className="flex items-center gap-2">
          <Swords className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Match:</span>
          <span className="font-medium">
            {team1Name && team2Name ? `${team1Name} vs ${team2Name}` : 'Unknown match'}
          </span>
          {matchDate && (
            <span className="text-xs text-muted-foreground">
              ({formatWithPattern(matchDate, 'MMM d, yyyy')})
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Submitter:</span>
            <span className="font-medium">{submission.submitter_name}</span>
          </div>

          {submission.submitter_team && (
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Team:</span>
              <span className="font-medium">{submission.submitter_team}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Message:</span>
          </div>
          <div className="bg-muted/50 p-3 rounded-md">
            <p className="text-sm">{submission.message}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-xs text-muted-foreground">
            Submitted {formatWithPattern(submission.created_at, "MMM d, yyyy 'at' h:mm a")}
          </span>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReject(submission)}
              className="text-destructive hover:text-destructive"
            >
              <XCircle className="size-4 mr-1" />
              Reject
            </Button>
            <Button size="sm" onClick={() => onApprove(submission)}>
              <CheckCircle className="size-4 mr-1" />
              Approve
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScoreSubmissionCard;
