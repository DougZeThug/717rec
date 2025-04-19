
import { supabase } from "@/integrations/supabase/client";

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
      console.log(`Found ${storageFiles.length} files to delete for team ${teamId}`);
      
      const filesToDelete = storageFiles.map(file => `${teamPath}/${file.name}`);
      
      const { error: deleteFilesError } = await supabase.storage
        .from('teams')
        .remove(filesToDelete);
        
      if (deleteFilesError) {
        console.warn('Error deleting team files:', deleteFilesError);
        // Continue with team deletion even if file cleanup fails
      } else {
        console.log('Successfully deleted team files');
      }
    }
    
    // Now delete the team from the database
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);
      
    if (error) {
      console.error('Error deleting team from database:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Team deletion failed:', error);
    throw error;
  }
};
