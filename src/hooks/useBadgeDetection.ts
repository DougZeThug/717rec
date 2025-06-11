
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BadgeType } from '@/types/badges';

interface BadgeDetectionParams {
  teamId: string;
  badgeType: BadgeType;
  metadata?: any;
}

export const useBadgeDetection = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const awardBadgeMutation = useMutation({
    mutationFn: async ({ teamId, badgeType, metadata }: BadgeDetectionParams) => {
      const { data, error } = await supabase
        .from('team_badge_events')
        .insert({
          team_id: teamId,
          badge_type: badgeType,
          metadata: metadata || {},
          awarded_at: new Date().toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate badge queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['team-badges', data.team_id] });
      queryClient.invalidateQueries({ queryKey: ['all-team-badges'] });
      
      toast({
        title: "Badge Awarded!",
        description: `New badge earned: ${data.badge_type.replace('_', ' ')}`,
      });
    },
    onError: (error) => {
      console.error('Error awarding badge:', error);
      toast({
        title: "Error",
        description: "Failed to award badge",
        variant: "destructive",
      });
    }
  });

  const revokeBadgeMutation = useMutation({
    mutationFn: async (badgeId: string) => {
      const { error } = await supabase
        .from('team_badge_events')
        .update({ is_active: false })
        .eq('id', badgeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-badges'] });
      queryClient.invalidateQueries({ queryKey: ['all-team-badges'] });
      
      toast({
        title: "Badge Revoked",
        description: "Badge has been deactivated",
      });
    },
    onError: (error) => {
      console.error('Error revoking badge:', error);
      toast({
        title: "Error", 
        description: "Failed to revoke badge",
        variant: "destructive",
      });
    }
  });

  const triggerBadgeDetection = useMutation({
    mutationFn: async (matchId: string) => {
      const { data, error } = await supabase.functions.invoke('badge-manager', {
        body: {
          event_type: 'manual_detection',
          match_id: matchId
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-badges'] });
      queryClient.invalidateQueries({ queryKey: ['all-team-badges'] });
      
      toast({
        title: "Badge Detection Complete",
        description: `${data.badgesAwarded || 0} badges awarded`,
      });
    },
    onError: (error) => {
      console.error('Error triggering badge detection:', error);
      toast({
        title: "Error",
        description: "Failed to trigger badge detection",
        variant: "destructive",
      });
    }
  });

  return {
    awardBadge: awardBadgeMutation.mutate,
    isAwarding: awardBadgeMutation.isPending,
    revokeBadge: revokeBadgeMutation.mutate,
    isRevoking: revokeBadgeMutation.isPending,
    triggerDetection: triggerBadgeDetection.mutate,
    isDetecting: triggerBadgeDetection.isPending
  };
};
