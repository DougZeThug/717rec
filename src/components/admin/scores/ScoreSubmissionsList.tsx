import { format } from 'date-fns';
import { CheckCircle, Clock, MessageSquare, User, Users, XCircle } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScoreSubmission } from '@/hooks/useScoreSubmissions';

interface ScoreSubmissionsListProps {
  submissions: ScoreSubmission[];
  onApprove: (submissionId: string) => void;
  onReject: (submissionId: string) => void;
}

const ScoreSubmissionsList = ({ submissions, onApprove, onReject }: ScoreSubmissionsListProps) => {
  if (submissions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No pending score submissions to review.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map((submission) => (
        <Card key={submission.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Score Submission</CardTitle>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Pending Review
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Submitter:</span>
                <span className="font-medium">{submission.submitter_name}</span>
              </div>

              {submission.submitter_team && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Team:</span>
                  <span className="font-medium">{submission.submitter_team}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Message:</span>
              </div>
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-sm">{submission.message}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-xs text-muted-foreground">
                Submitted {format(new Date(submission.created_at), "MMM d, yyyy 'at' h:mm a")}
              </span>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReject(submission.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button size="sm" onClick={() => onApprove(submission.id)}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ScoreSubmissionsList;
