import { supabase } from '@/integrations/supabase/client';

interface BasicTeamUpdate {
  name?: string;
  image_url?: string | null;
}

/**
 * Hook for basic team updates (name and image_url only)
 * For more complex team operations, use useTeamMutations instead
 */
export const useTeamBasicUpdate = () => {
  const updateTeamBasicInfo = async (teamId: string, updates: BasicTeamUpdate): Promise<void> => {
    const { error } = await supabase
      .from('teams')
      .update({
        ...(updates.name !== undefined && { name: updates.name.trim() }),
        ...(updates.image_url !== undefined && { image_url: updates.image_url?.trim() || null }),
      })
      .eq('id', teamId);

    if (error) {
      throw error;
    }
  };

  return {
    updateTeamBasicInfo,
  };
};
