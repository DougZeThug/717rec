import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { errorLog } from '@/utils/logger';

interface PendingMembershipData {
  id: string;
  user_id: string;
  team_id: string;
  joined_at: string;
  is_approved: boolean;
  user: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
  team: {
    id: string;
    name: string;
    logo_url?: string;
    image_url?: string;
  };
}

export const usePendingMemberships = () => {
  return useQuery({
    queryKey: ['pending-memberships'],
    queryFn: async () => {
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

      if (error) {
        errorLog('Error fetching pending memberships:', error);
        throw error;
      }

      return (data || []) as PendingMembershipData[];
    },
  });
};

interface ApproveMembershipData {
  membershipId: string;
  approved: boolean;
  approvedBy: string;
}

export const useApproveMembership = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ membershipId, approved, approvedBy }: ApproveMembershipData) => {
      const updateData: any = {
        is_approved: approved,
      };

      if (approved) {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = approvedBy;
      }

      const { error } = await supabase
        .from('team_memberships')
        .update(updateData)
        .eq('id', membershipId);

      if (error) {
        throw error;
      }

      return { membershipId, approved };
    },
    onSuccess: () => {
      // Invalidate pending memberships query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['pending-memberships'] });
    },
  });
};
