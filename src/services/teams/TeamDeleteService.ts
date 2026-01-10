import { supabase } from '@/integrations/supabase/client';
import { errorLog, teamLog, warnLog } from '@/utils/logger';

/**
 * Delete a team and clean up associated storage files
 */
export const deleteTeamApi = async (teamId: string) => {
  try {
    // First, try to clean up any associated team images
    const teamPath = `teams/${teamId}`;

    // List all files for this team in the storage bucket
    const { data: storageFiles, error: listError } = await supabase.storage
      .from('teams')
      .list(teamPath);

    // If files exist for this team, delete them
    if (storageFiles && storageFiles.length > 0) {
      teamLog(`Found ${storageFiles.length} files to delete for team ${teamId}`);

      const filesToDelete = storageFiles.map((file) => `${teamPath}/${file.name}`);

      const { error: deleteFilesError } = await supabase.storage
        .from('teams')
        .remove(filesToDelete);

      if (deleteFilesError) {
        warnLog('Error deleting team files:', deleteFilesError);
        // Continue with team deletion even if file cleanup fails
      } else {
        teamLog('Successfully deleted team files');
      }
    }

    // Now delete the team from the database
    const { error } = await supabase.from('teams').delete().eq('id', teamId);

    if (error) {
      errorLog('Error deleting team from database:', error);
      throw error;
    }

    return true;
  } catch (error) {
    errorLog('Team deletion failed:', error);
    throw error;
  }
};
