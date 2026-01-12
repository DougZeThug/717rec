import { CheckCircle, Clock, Loader2, Users, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';

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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { errorLog } from '@/utils/logger';

interface UserProfile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
}

interface TeamInfo {
  id: string;
  name: string;
  logo_url?: string;
  image_url?: string;
}

interface PendingMembershipRaw {
  id: string;
  user_id: string;
  team_id: string;
  joined_at: string;
  is_approved: boolean;
  user: UserProfile | UserProfile[] | null;
  team: TeamInfo | TeamInfo[] | null;
}

interface PendingMembership {
  id: string;
  user_id: string;
  team_id: string;
  joined_at: string;
  is_approved: boolean;
  user: UserProfile;
  team: TeamInfo;
}

const TeamMembershipApprovalTab: React.FC = () => {
  const [pendingMemberships, setPendingMemberships] = useState<PendingMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingMemberships();
  }, []);

  const fetchPendingMemberships = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('team_memberships')
        .select(
          `
          id,
          user_id,
          team_id,
          joined_at,
          is_approved,
          user:profiles(id, username, full_name, avatar_url),
          team:teams(id, name, logo_url, image_url)
        `
        )
        .eq('is_approved', false)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      
      // Normalize data - Supabase returns joined relations as arrays
      const normalized: PendingMembership[] = ((data as PendingMembershipRaw[]) || [])
        .map((item) => {
          const user = Array.isArray(item.user) ? item.user[0] : item.user;
          const team = Array.isArray(item.team) ? item.team[0] : item.team;
          
          // Skip if user or team data is missing
          if (!user || !team) return null;
          
          return {
            ...item,
            user,
            team,
          };
        })
        .filter((item): item is PendingMembership => item !== null);
      
      setPendingMemberships(normalized);
    } catch (error) {
      errorLog('Error fetching pending memberships:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending team memberships',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproval = async (membershipId: string, approved: boolean) => {
    try {
      setProcessingId(membershipId);

      const updateData: any = {
        is_approved: approved,
      };

      if (approved) {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = (await supabase.auth.getUser()).data.user?.id;
      }

      const { error } = await supabase
        .from('team_memberships')
        .update(updateData)
        .eq('id', membershipId);

      if (error) throw error;

      // Remove from pending list
      setPendingMemberships((prev) => prev.filter((m) => m.id !== membershipId));

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
    } finally {
      setProcessingId(null);
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

export default TeamMembershipApprovalTab;
