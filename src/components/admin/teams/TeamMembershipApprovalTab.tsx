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
import { errorLog } from '@/utils/logger';

const TeamMembershipApprovalTab: React.FC = () => {
  const { toast } = useToast();
  const { pendingMemberships, isLoading, approveMembership, processingId } = usePendingMemberships();

  const handleApproval = async (membershipId: string, approved: boolean) => {
    try {
      await approveMembership(membershipId, approved);

      toast({
        title: approved ? 'Membership Approved' : 'Membership Rejected',
        description: approved
          ? 'The user can now edit team details'
          : 'The membership request has been rejected',
      });
    } catch (error) {
      errorLog('Error updating membership:', error);
      toast({
        title: 'Error',
        description: 'Failed to update membership status',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Team Membership Approvals</h2>
        <Badge variant="secondary">{pendingMemberships.length} pending</Badge>
      </div>

      {pendingMemberships.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
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
            <Card key={membership.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        {membership.user.avatar_url ? (
                          <img
                            src={membership.user.avatar_url}
                            alt="User"
                            loading="lazy"
                            decoding="async"
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <span className="text-sm font-medium">
                            {(membership.user.full_name || membership.user.username || 'User')
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {membership.user.full_name ||
                            membership.user.username ||
                            'Anonymous User'}
                        </p>
                        <p className="text-xs text-muted-foreground">wants to join</p>
                      </div>
                    </div>
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
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(membership.joined_at).toLocaleDateString()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApproval(membership.id, true)}
                    disabled={processingId === membership.id}
                    className="bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    {processingId === membership.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </>
                    )}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                        disabled={processingId === membership.id}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reject membership request?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to reject this membership request? The user will be
                          removed from the team.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleApproval(membership.id, false)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Reject Request
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(TeamMembershipApprovalTab);
