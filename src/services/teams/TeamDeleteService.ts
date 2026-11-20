import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';
import { teamLog, warnLog } from '@/utils/logger';

/**
 * Delete a team row, then clean up its storage files (best effort).
 * The row goes first: if the database refuses the delete, the images stay.
 * @throws {DatabaseError} Only when the team row delete fails. A storage
 *   cleanup failure is logged and never thrown.
 */
export const deleteTeamApi = async (teamId: string): Promise<void> => {
  // Delete the team from the database first
  const { data: deleted, error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId)
    .select('id');

  if (error) {
    handleDatabaseError(error, 'Failed to delete team from database');
  }

  // 0 rows: the team is already gone (a second click) or a policy blocked the
  // delete. Do not throw, and do not touch storage: we cannot tell if the team
  // still exists, and its images must not go while it might.
  if (!deleted || deleted.length === 0) {
    return;
  }

  // The row is gone. Now try to clean up any associated team images.
  const teamPath = `teams/${teamId}`;

  // List all files for this team in the storage bucket
  const { data: storageFiles, error: listError } = await supabase.storage
    .from('teams')
    .list(teamPath);

  if (listError) {
    warnLog('Error listing team files:', listError);
  }

  // If files exist for this team, delete them
  if (storageFiles && storageFiles.length > 0) {
    teamLog(`Found ${storageFiles.length} files to delete for team ${teamId}`);

    const filesToDelete = storageFiles.map((file) => `${teamPath}/${file.name}`);

    const { error: deleteFilesError } = await supabase.storage.from('teams').remove(filesToDelete);

    if (deleteFilesError) {
      // The team is already deleted, so leftover files are only wasted space.
      warnLog('Error deleting team files:', deleteFilesError);
    } else {
      teamLog('Successfully deleted team files');
    }
  }
};
