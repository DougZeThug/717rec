import { AlertTriangle, CheckCircle, Clock, Loader2, Users, XCircle } from 'lucide-react';
import React from 'react';

import { TeamLogo } from '@/components/shared/TeamLogo';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { usePendingMemberships } from '@/hooks/usePendingMemberships';
import { useToast } from '@/hooks/useToast';
import { getUIErrorMessage } from '@/utils/errorHandler';
import { toLocalDateString } from '@/utils/formatDateSafe';
import { errorLog } from '@/utils/logger';

type PendingMembership = ReturnType<typeof usePendingMemberships>['pendingMemberships'][number];

type PendingMembershipUser = PendingMembership['user'];

const MembershipUser: React.FC<{ user: PendingMembershipUser }> = ({ user }) => (
  <div className="flex items-center gap-2">
    <div className="size-8 bg-muted rounded-full flex items-center justify-center">
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt="User"
          loading="lazy"
          decoding="async"
          className="size-8 rounded-full"
        />
      ) : (
        <span className="text-sm font-medium">
          {(user.full_name || user.username || 'User').charAt(0).toUpperCase()}
        </span>
      )}
    </div>
    <div>
      <p className="font-medium">{user.full_name || user.username || 'Anonymous User'}</p>
      <p className="text-xs text-muted-foreground">wants to join</p>
    </div>
  </div>
);

interface MembershipSummaryProps {
  membership: PendingMembership;
}

const MembershipSummary: React.FC<MembershipSummaryProps> = ({ membership }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <MembershipUser user={membership.user} />
      <div className="flex items-center gap-2">
        <TeamLogo
          imageUrl={membership.team.image_url || membership.team.logo_url}
          teamName={membership.team.name}
          size="sm"
          rounded
        />
        <span className="font-medium">{membership.team.name}</span>
      </div>
    </div>
    <Badge variant="outline">
      <Clock className="size-3 mr-1" />
      {toLocalDateString(membership.joined_at)}
    </Badge>
  </div>
);

interface RejectMembershipDialogProps {
  isProcessing: boolean;
  onReject: () => void;
}

const RejectMembershipDialog: React.FC<RejectMembershipDialogProps> = ({
  isProcessing,
  onReject,
}) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive-text border-destructive hover:bg-destructive hover:text-foreground"
        disabled={isProcessing}
      >
        <XCircle className="size-4 mr-1" />
        Reject
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Reject membership request?</AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to reject this request to join? The person is shown that it was
          declined, and can ask again.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={() => onReject()}
          disabled={isProcessing}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          Reject Request
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

interface MembershipActionsProps {
  membership: PendingMembership;
  isProcessing: boolean;
  onApproval: (membershipId: string, approved: boolean) => void;
}

const MembershipActions: React.FC<MembershipActionsProps> = ({
  membership,
  isProcessing,
  onApproval,
}) => (
  <div className="flex gap-2">
    <Button
      onClick={() => onApproval(membership.id, true)}
      disabled={isProcessing}
      className="bg-green-600 hover:bg-green-700"
      size="sm"
    >
      {isProcessing ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <>
          <CheckCircle className="size-4 mr-1" />
          Approve
        </>
      )}
    </Button>

    <RejectMembershipDialog
      isProcessing={isProcessing}
      onReject={() => onApproval(membership.id, false)}
    />
  </div>
);

interface MembershipCardProps {
  membership: PendingMembership;
  isProcessing: boolean;
  onApproval: (membershipId: string, approved: boolean) => void;
}

const MembershipCard: React.FC<MembershipCardProps> = ({
  membership,
  isProcessing,
  onApproval,
}) => (
  <Card>
    <CardHeader className="pb-3">
      <MembershipSummary membership={membership} />
    </CardHeader>
    <CardContent>
      <MembershipActions
        membership={membership}
        isProcessing={isProcessing}
        onApproval={onApproval}
      />
    </CardContent>
  </Card>
);

const TeamMembershipApprovalTab: React.FC = () => {
  const { toast } = useToast();
  const { pendingMemberships, isLoading, isError, error, approveMembership, processingIds } =
    usePendingMemberships();

  const handleApproval = async (membershipId: string, approved: boolean) => {
    // The buttons are disabled while a row is saving, but a dialog that is
    // already open can still fire, so refuse a second action on the same row.
    if (processingIds.has(membershipId)) return;

    try {
      await approveMembership(membershipId, approved);

      toast({
        title: approved ? 'Membership Approved' : 'Membership Rejected',
        description: approved
          ? 'The user can now edit team details'
          : 'The person is shown that their request was declined',
      });
    } catch (error) {
      errorLog('Error updating membership:', error);
      toast({
        title: 'Error',
        description: getUIErrorMessage(error, 'Failed to update membership status'),
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertTriangle className="size-12 text-destructive-text mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Failed to load memberships</h3>
            <p className="text-muted-foreground">
              {error instanceof Error
                ? error.message
                : 'An unexpected error occurred. Please try again later.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="size-5" />
        <h2 className="text-xl font-semibold">Team Membership Approvals</h2>
        <Badge variant="secondary">{pendingMemberships.length} pending</Badge>
      </div>

      {pendingMemberships.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CheckCircle className="size-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">All caught up!</h3>
              <p className="text-muted-foreground">
                No pending team membership requests at this time.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingMemberships.map((membership) => (
            <MembershipCard
              key={membership.id}
              membership={membership}
              isProcessing={processingIds.has(membership.id)}
              onApproval={handleApproval}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(TeamMembershipApprovalTab);
