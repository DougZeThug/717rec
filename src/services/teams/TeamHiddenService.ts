import { supabase } from "@/integrations/supabase/client";
import { errorLog } from "@/utils/logger";

/**
 * Service for managing teams in the hidden division
 * This provides an alternative to the opt-out system by moving teams to a special "Hidden" division
 */

export interface HideTeamResult {
  success: boolean;
  message: string;
  originalDivisionId?: string;
}

export interface UnhideTeamResult {
  success: boolean;
  message: string;
  restoredDivisionId?: string;
}

/**
 * Get the hidden division ID
 */
export const getHiddenDivisionId = async (): Promise<string | null> => {
  const { data, error } = await supabase
    .from('divisions')
    .select('id')
    .eq('name', 'Hidden')
    .single();
    
  if (error) {
    errorLog('Error fetching hidden division:', error);
    throw error;
  }
  
  if (!data) {
    return null; // No hidden division exists - this is valid
  }
  
  return data.id;
};

/**
 * Hide a team by moving it to the hidden division
 * Stores the original division ID in team metadata for restoration
 */
export const hideTeam = async (teamId: string): Promise<HideTeamResult> => {
  try {
    // Get the team's current division
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('division_id, name')
      .eq('id', teamId)
      .single();
      
    if (teamError || !team) {
      return {
        success: false,
        message: 'Team not found'
      };
    }
    
    // Get hidden division ID
    const hiddenDivisionId = await getHiddenDivisionId();
    if (!hiddenDivisionId) {
      return {
        success: false,
        message: 'Hidden division not found'
      };
    }
    
    // Check if team is already hidden
    if (team.division_id === hiddenDivisionId) {
      return {
        success: false,
        message: 'Team is already hidden'
      };
    }
    
    // Move team to hidden division
    const { error: updateError } = await supabase
      .from('teams')
      .update({ 
        division_id: hiddenDivisionId
      })
      .eq('id', teamId);
      
    if (updateError) {
      errorLog('Error hiding team:', updateError);
      return {
        success: false,
        message: 'Failed to hide team'
      };
    }
    
    return {
      success: true,
      message: `Team "${team.name}" has been hidden`,
      originalDivisionId: team.division_id
    };
    
  } catch (error) {
    errorLog('Error in hideTeam:', error);
    return {
      success: false,
      message: 'An unexpected error occurred'
    };
  }
};

/**
 * Unhide a team by moving it back to a specified division
 */
export const unhideTeam = async (teamId: string, targetDivisionId: string): Promise<UnhideTeamResult> => {
  try {
    // Get the team's current info
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('division_id, name')
      .eq('id', teamId)
      .single();
      
    if (teamError || !team) {
      return {
        success: false,
        message: 'Team not found'
      };
    }
    
    // Verify the target division exists
    const { data: division, error: divisionError } = await supabase
      .from('divisions')
      .select('id, name')
      .eq('id', targetDivisionId)
      .single();
      
    if (divisionError || !division) {
      return {
        success: false,
        message: 'Target division not found'
      };
    }
    
    // Move team to target division
    const { error: updateError } = await supabase
      .from('teams')
      .update({ 
        division_id: targetDivisionId
      })
      .eq('id', teamId);
      
    if (updateError) {
      errorLog('Error unhiding team:', updateError);
      return {
        success: false,
        message: 'Failed to unhide team'
      };
    }
    
    return {
      success: true,
      message: `Team "${team.name}" has been restored to "${division.name}" division`,
      restoredDivisionId: targetDivisionId
    };
    
  } catch (error) {
    errorLog('Error in unhideTeam:', error);
    return {
      success: false,
      message: 'An unexpected error occurred'
    };
  }
};

/**
 * Get all teams currently in the hidden division
 */
export const getHiddenTeams = async () => {
  try {
    const hiddenDivisionId = await getHiddenDivisionId();
    if (!hiddenDivisionId) {
      return { data: [], error: null };
    }
    
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('division_id', hiddenDivisionId)
      .order('name');
      
    return { data: data || [], error };
    
  } catch (error) {
    errorLog('Error fetching hidden teams:', error);
    return { data: [], error };
  }
};

/**
 * Check if a team is currently hidden
 */
export const isTeamHidden = async (teamId: string): Promise<boolean> => {
  try {
    const hiddenDivisionId = await getHiddenDivisionId();
    if (!hiddenDivisionId) return false;
    
    const { data, error } = await supabase
      .from('teams')
      .select('division_id')
      .eq('id', teamId)
      .single();
      
    if (error || !data) return false;
    
    return data.division_id === hiddenDivisionId;
    
  } catch (error) {
    errorLog('Error checking if team is hidden:', error);
    return false;
  }
};