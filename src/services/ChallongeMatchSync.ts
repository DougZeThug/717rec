
import { supabase } from "@/integrations/supabase/client";
import { ChallongeService } from "./ChallongeService";
import type { Database } from "@/integrations/supabase/types";

// DB row types for playoff_matches table
type PlayoffMatchInsert = Database["public"]["Tables"]["playoff_matches"]["Insert"];

/** Minimal shape returned by Challonge /matches endpoint that we need. */
type RawChallongeMatch = {
  id: number;
  round: number;                       // positive = WB, negative = LB
  group_id: number | null;
  suggested_play_order: number | null;
  player1_id: number | null;
  player2_id: number | null;
  winner_id: number | null;
  loser_id: number | null;
  state: string;
};

/** Challonge /participants payload with the misc field we store */
type RawChallongeParticipant = {
  id: number;
  name: string;
  misc: string | null;     // holds local team-uuid
};

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

    // ─── transform Challonge → playoff_matches ──────────────────────────
    const rawMatches = matches as unknown as RawChallongeMatch[];

    const rows: PlayoffMatchInsert[] = rawMatches.map((m) => ({
      bracket_id: bracketId,
      round: Math.abs(m.round), // Use absolute value for round number
      position: m.suggested_play_order ?? 1,
      match_type: m.group_id
        ? "losers"
        : m.round > 0
        ? "winners"
        : "finals",
      best_of: 3,
      
      // Map Challonge participant IDs to local team IDs
      team1_id: teamMap[m.player1_id ?? 0] ?? null,
      team2_id: teamMap[m.player2_id ?? 0] ?? null,
      winner_id: teamMap[m.winner_id ?? 0] ?? null,
      
      // Set status based on Challonge match state
      status: m.state === "complete" ? "completed" : "pending",
      
      // Store original Challonge match data for reference
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    // ─────────────────────────────────────────────────────────────────────

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
    
    // Create name-to-ID lookup for fallback matching
    const teamNameToId: { [name: string]: string } = {};
    teams.forEach(team => {
      teamNameToId[team.name.toLowerCase()] = team.id;
    });
    
    const map: { [id: number]: string } = {};

    (participants as unknown as RawChallongeParticipant[]).forEach((p) => {
      if (p.misc) {
        map[p.id] = p.misc;         // happy path
      } else {
        // fallback to name match if misc missing
        const found = teamNameToId[p.name?.toLowerCase() ?? ""];
        if (found) map[p.id] = found;
      }
    });

    console.log("✅ Built participant map:", map);
    return map;
    
  } catch (error) {
    console.error("❌ Error building participant map:", error);
    throw new Error(`Failed to build participant map: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
