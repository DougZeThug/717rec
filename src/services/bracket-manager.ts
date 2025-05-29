
import { ChallongeService } from "@/services/ChallongeService";
import { supabase } from "@/integrations/supabase/client";
import { syncChallongeMatches, buildParticipantMap } from "@/services/ChallongeMatchSync";
import { challengeLog, successLog, failureLog } from "@/utils/logger";
import { ChallongeError, SupabaseError } from "@/utils/errors";

export interface MatchReportOptions {
  tournamentId: string;
  matchId: string;
  scoresCsv: string;
  winnerId: string;
}

export interface MatchResyncOptions {
  bracketId: string;
  challongeTournamentId: number;
}

export async function reportMatch(options: MatchReportOptions) {
  const { tournamentId, matchId, scoresCsv, winnerId } = options;
  
  challengeLog("Reporting match result:", { tournamentId, matchId, winnerId });
  
  try {
    const result = await ChallongeService.updateMatch({
      tournamentId,
      matchId,
      scoresCsv,
      winnerId,
    });
    
    successLog("Match reported successfully", `Match ID: ${matchId}`);
    return result;
    
  } catch (error) {
    failureLog("Match report failed", error);
    throw new ChallongeError(`Failed to update match in Challonge: ${error instanceof Error ? error.message : 'Unknown error'}`, "reportMatch");
  }
}

export async function resyncMatches(options: MatchResyncOptions) {
  const { bracketId, challongeTournamentId } = options;
  
  challengeLog("Resyncing matches from Challonge:", { bracketId, challongeTournamentId });
  
  try {
    // Get bracket details to find teams
    const { data: bracket, error: bracketError } = await supabase
      .from('brackets')
      .select(`
        id,
        division_id,
        divisions!inner(id)
      `)
      .eq('id', bracketId)
      .single();
      
    if (bracketError || !bracket) {
      throw new SupabaseError(`Failed to fetch bracket: ${bracketError?.message || 'Bracket not found'}`, "brackets", "select");
    }
    
    // Get teams in this division
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('division_id', bracket.division_id);
      
    if (teamsError) {
      throw new SupabaseError(`Failed to fetch teams: ${teamsError.message}`, "teams", "select");
    }
    
    // Build participant map
    const participantMap = await buildParticipantMap(teams || [], challongeTournamentId.toString());
    
    // Delete existing playoff matches for this bracket
    const { error: deleteError } = await supabase
      .from('playoff_matches')
      .delete()
      .eq('bracket_id', bracketId);
      
    if (deleteError) {
      throw new SupabaseError(`Failed to clear existing matches: ${deleteError.message}`, "playoff_matches", "delete");
    }
    
    // Sync matches from Challonge
    await syncChallongeMatches(challongeTournamentId, bracketId, participantMap);
    
    successLog("Match resync completed successfully");
    return { success: true };
    
  } catch (error) {
    failureLog("Match resync failed", error);
    throw new Error(`Failed to resync matches: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
