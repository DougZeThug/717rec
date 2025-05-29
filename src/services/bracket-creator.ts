
import { ChallongeService } from "@/services/ChallongeService";
import { supabase } from "@/integrations/supabase/client";
import { syncChallongeMatches, buildParticipantMap } from "@/services/ChallongeMatchSync";
import { bracketLog, successLog, failureLog, progressLog } from "@/utils/logger";
import { ChallongeError, SupabaseError } from "@/utils/errors";

export interface BracketCreationOptions {
  name: string;
  format: "singleElim" | "doubleElim";
  tournamentType: "single elimination" | "double elimination";
  divisionId: string;
  teams: { id: string; name: string; seed?: number }[];
  onProgress?: (step: string) => void;
}

export interface BracketCreationResult {
  bracketId: string;
  challongeTournamentId: number;
}

export async function createBracket(options: BracketCreationOptions): Promise<BracketCreationResult> {
  const { name, tournamentType, divisionId, teams, onProgress } = options;
  
  bracketLog("Starting bracket creation:", { name, format: options.format, teamCount: teams.length });
  
  let tournament: any = null;
  let bracketId: string | null = null;
  
  try {
    // Step 1: Create Challonge tournament
    onProgress?.("Creating Challonge tournament...");
    progressLog(1, 5, "Creating Challonge tournament");
    
    tournament = await ChallongeService.createTournament({
      name,
      tournamentType,
      description: `Tournament created for ${name}`
    });
    
    successLog("Challonge tournament created", `ID: ${tournament.id}`);
    
    // Step 2: Add teams to tournament with seeding
    onProgress?.("Adding teams to tournament...");
    progressLog(2, 5, "Adding teams with seeding");
    
    const sortedTeams = teams.sort((a, b) => (a.seed || 999) - (b.seed || 999));
    await ChallongeService.addTeamsToTournament(tournament.id.toString(), sortedTeams);
    
    successLog("Teams added to tournament", `Count: ${sortedTeams.length}`);
    
    // Step 3: Start tournament
    onProgress?.("Starting tournament...");
    progressLog(3, 5, "Starting Challonge tournament");
    
    await ChallongeService.startTournament(tournament.id.toString());
    successLog("Tournament started successfully");
    
    // Step 4: Save bracket to local database
    onProgress?.("Saving bracket to database...");
    progressLog(4, 5, "Creating local bracket record");
    
    const { data: bracketData, error: insertError } = await supabase
      .from("brackets")
      .insert({
        title: name.trim(),
        division_id: divisionId,
        format: options.format,
        state: "pending",
        challonge_tournament_id: Number(tournament.id),
      })
      .select("id")
      .single();
    
    if (insertError || !bracketData) {
      throw new SupabaseError(`Failed to save bracket: ${insertError?.message || 'No data returned'}`, "brackets", "insert");
    }
    
    bracketId = bracketData.id;
    successLog("Local bracket saved", `ID: ${bracketId}`);
    
    // Step 5: Sync matches from Challonge
    onProgress?.("Syncing matches...");
    progressLog(5, 5, "Syncing matches from Challonge");
    
    try {
      // Create local participants
      for (const team of sortedTeams) {
        await supabase
          .from('participants')
          .insert({
            bracket_id: bracketId,
            team_id: team.id,
            position: team.seed || 1,
            name: team.name
          });
      }
      
      // Build participant map and sync matches
      const participantMap = await buildParticipantMap(sortedTeams, tournament.id.toString());
      await syncChallongeMatches(tournament.id, bracketId, participantMap);
      
      successLog("Match sync completed successfully");
    } catch (syncError) {
      failureLog("Match sync failed", syncError);
      // Don't throw here - bracket was created successfully
    }
    
    onProgress?.("Complete!");
    
    return {
      bracketId,
      challongeTournamentId: tournament.id
    };
    
  } catch (error) {
    failureLog("Bracket creation failed", error);
    
    // If we have a tournament but no local bracket, this is a partial failure
    if (tournament && !bracketId) {
      throw new Error("Tournament created in Challonge but local save failed. Check your database connection.");
    }
    
    // Re-throw with appropriate error type
    if (error instanceof ChallongeError || error instanceof SupabaseError) {
      throw error;
    }
    
    throw new Error(`Bracket creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
