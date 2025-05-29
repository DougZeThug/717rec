
import { supabase } from "@/integrations/supabase/client";
import { ChallongeService } from "./ChallongeService";
import type { Database } from "@/integrations/supabase/types";

// DB row types for playoff_matches table
type PlayoffMatchInsert = Database["public"]["Tables"]["playoff_matches"]["Insert"];

interface ParticipantMap {
  [challongeParticipantId: number]: string; // maps to local team_id (uuid)
}

/**
 * Fetches all matches for a Challonge tournament, converts them to the
 * local playoff_matches shape, and bulk-inserts them.
 *
 * @param challongeTournamentId - numeric id returned by Challonge
 * @param bracketId - uuid from local `brackets` table
 * @param teamMap - challongeParticipantId → local team_id
 */
export async function syncChallongeMatches(
  challongeTournamentId: string | number,
  bracketId: string,
  teamMap: ParticipantMap
): Promise<void> {
  console.log("🔄 Starting Challonge match sync for tournament:", challongeTournamentId);
  
  try {
    // 1. Fetch matches from Challonge using existing service method
    const matches = await ChallongeService.getMatches(challongeTournamentId.toString());
    
    if (!matches || matches.length === 0) {
      console.log("⚠️ No matches found in Challonge tournament");
      return;
    }

    console.log(`📊 Found ${matches.length} matches to sync`);

    // 2. Transform Challonge matches to playoff_matches format
    const rows: PlayoffMatchInsert[] = matches.map((match, index) => {
      // Determine match type based on Challonge match structure
      let matchType: "winners" | "losers" | "finals" = "winners";
      
      // In Challonge, negative rounds are typically losers bracket
      if (match.round < 0) {
        matchType = "losers";
      } else if (match.round === 1 && matches.filter(m => m.round === 1).length === 1) {
        // If there's only one match in round 1, it's likely the finals
        matchType = "finals";
      }

      // Calculate position - use suggested_play_order if available, otherwise use index
      const position = match.suggested_play_order || (index + 1);

      const transformedMatch: PlayoffMatchInsert = {
        bracket_id: bracketId,
        round: Math.abs(match.round), // Use absolute value for round number
        position: position,
        match_type: matchType,
        best_of: 3, // Default best of 3 for the league
        
        // Map Challonge participant IDs to local team IDs
        team1_id: match.player1_id ? teamMap[match.player1_id] || null : null,
        team2_id: match.player2_id ? teamMap[match.player2_id] || null : null,
        winner_id: match.winner_id ? teamMap[match.winner_id] || null : null,
        
        // Set status based on Challonge match state
        status: match.state === "complete" ? "completed" : "pending",
        
        // Store original Challonge match data for reference
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return transformedMatch;
    });

    // Filter out matches with missing team mappings (log warnings)
    const validRows = rows.filter(row => {
      if (!row.team1_id && !row.team2_id) {
        console.warn("⚠️ Skipping match with no valid team mappings:", row);
        return false;
      }
      return true;
    });

    if (validRows.length === 0) {
      throw new Error("No valid matches to sync - all matches missing team mappings");
    }

    console.log(`✅ Syncing ${validRows.length} valid matches to playoff_matches table`);

    // 3. Bulk insert into playoff_matches table
    const { error } = await supabase
      .from("playoff_matches")
      .insert(validRows);

    if (error) {
      throw new Error(`Failed to insert matches into playoff_matches: ${error.message}`);
    }

    console.log(`🎉 Successfully synced ${validRows.length} matches from Challonge`);

  } catch (error) {
    console.error("❌ Error syncing Challonge matches:", error);
    throw new Error(`Match sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper function to build participant map from teams that were added to Challonge
 * @param teams - Array of teams with their Challonge participant info
 * @param challongeTournamentId - Tournament ID to fetch participants from
 */
export async function buildParticipantMap(
  teams: { id: string; name: string }[],
  challongeTournamentId: string
): Promise<ParticipantMap> {
  console.log("🔄 Building participant map for tournament:", challongeTournamentId);
  
  try {
    // Fetch participants from Challonge
    const participants = await ChallongeService.getParticipants(challongeTournamentId);
    
    const participantMap: ParticipantMap = {};
    
    // Map participants using misc_info field which contains local team ID
    participants.forEach(participant => {
      if (participant.misc_info) {
        // misc_info contains the local team ID
        participantMap[participant.id] = participant.misc_info;
      } else {
        // Fallback: try to match by name
        const matchingTeam = teams.find(team => team.name === participant.name);
        if (matchingTeam) {
          participantMap[participant.id] = matchingTeam.id;
        }
      }
    });

    console.log("✅ Built participant map:", participantMap);
    return participantMap;
    
  } catch (error) {
    console.error("❌ Error building participant map:", error);
    throw new Error(`Failed to build participant map: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
