
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
 */
export async function syncChallongeMatches(
  challongeTournamentId: string | number,
  bracketId: string,
  teamMap: ParticipantMap
): Promise<void> {
  console.log("🔄 Starting Challonge match sync for tournament:", challongeTournamentId);
  console.log("🎯 Target bracket ID:", bracketId);
  console.log("🗺️ Using team map with", Object.keys(teamMap).length, "entries");
  
  try {
    // 1. Fetch matches from Challonge using existing service method
    console.log("📥 Fetching matches from Challonge...");
    const matches = await ChallongeService.getMatches(challongeTournamentId.toString());
    
    if (!matches || matches.length === 0) {
      console.log("⚠️ No matches found in Challonge tournament");
      return;
    }

    console.log(`📊 Found ${matches.length} matches to sync`);
    console.log("First few matches:", matches.slice(0, 3));

    // ─── transform Challonge → playoff_matches ──────────────────────────
    const rawMatches = matches as unknown as RawChallongeMatch[];

    const rows: PlayoffMatchInsert[] = rawMatches.map((m, index) => {
      console.log(`🔄 Processing match ${index + 1}/${rawMatches.length}:`, {
        id: m.id,
        round: m.round,
        player1_id: m.player1_id,
        player2_id: m.player2_id,
        state: m.state
      });
      
      const team1_id = teamMap[m.player1_id ?? 0] ?? null;
      const team2_id = teamMap[m.player2_id ?? 0] ?? null;
      const winner_id = teamMap[m.winner_id ?? 0] ?? null;
      
      console.log(`  → Mapped teams: team1=${team1_id}, team2=${team2_id}, winner=${winner_id}`);
      
      return {
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
        team1_id,
        team2_id,
        winner_id,
        
        // Set status based on Challonge match state
        status: m.state === "complete" ? "completed" : "pending",
        
        // Store original Challonge match data for reference
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    // ─────────────────────────────────────────────────────────────────────

    // Filter out matches with missing team mappings (log warnings)
    const validRows = rows.filter((row, index) => {
      if (!row.team1_id && !row.team2_id) {
        console.warn(`⚠️ Skipping match ${index + 1} with no valid team mappings:`, row);
        return false;
      }
      if (!row.team1_id) {
        console.warn(`⚠️ Match ${index + 1} missing team1_id but has team2_id, keeping it`);
      }
      if (!row.team2_id) {
        console.warn(`⚠️ Match ${index + 1} missing team2_id but has team1_id, keeping it`);
      }
      return true;
    });

    if (validRows.length === 0) {
      console.error("❌ No valid matches to sync - all matches missing team mappings");
      console.error("Available team map:", teamMap);
      console.error("Raw matches sample:", rawMatches.slice(0, 2));
      throw new Error("No valid matches to sync - all matches missing team mappings");
    }

    console.log(`✅ Syncing ${validRows.length} valid matches to playoff_matches table`);
    console.log("Sample valid row:", validRows[0]);

    // 3. Bulk insert into playoff_matches table
    console.log("💾 Inserting matches into database...");
    const { error } = await supabase
      .from("playoff_matches")
      .insert(validRows);

    if (error) {
      console.error("❌ Database insert error:", error);
      throw new Error(`Failed to insert matches into playoff_matches: ${error.message}`);
    }

    console.log(`🎉 Successfully synced ${validRows.length} matches from Challonge`);

  } catch (error) {
    console.error("❌ Error syncing Challonge matches:", error);
    console.error("Error details:", error.message);
    if (error.stack) {
      console.error("Error stack:", error.stack);
    }
    throw new Error(`Match sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper function to build participant map from teams that were added to Challonge
 */
export async function buildParticipantMap(
  teams: { id: string; name: string }[],
  challongeTournamentId: string
): Promise<ParticipantMap> {
  console.log("🔄 Building participant map for tournament:", challongeTournamentId);
  console.log("🎯 Input teams:", teams.map(t => ({ id: t.id, name: t.name })));
  
  try {
    // Fetch participants from Challonge
    console.log("📥 Fetching participants from Challonge...");
    const participants = await ChallongeService.getParticipants(challongeTournamentId);
    console.log("📊 Received participants from Challonge:", participants.length);
    console.log("Participants details:", participants.map(p => ({ 
      id: p.id, 
      name: p.name, 
      misc: (p as any).misc 
    })));
    
    // Create name-to-ID lookup for fallback matching
    const teamNameToId: { [name: string]: string } = {};
    teams.forEach(team => {
      teamNameToId[team.name.toLowerCase()] = team.id;
    });
    console.log("🗂️ Team name lookup:", teamNameToId);
    
    const map: { [id: number]: string } = {};

    (participants as unknown as RawChallongeParticipant[]).forEach((p) => {
      console.log(`🔄 Processing participant ${p.id} (${p.name}):`, {
        misc: p.misc,
        hasValidMisc: !!p.misc && p.misc.length > 0
      });
      
      if (p.misc && p.misc.trim().length > 0) {
        map[p.id] = p.misc.trim();
        console.log(`  ✅ Mapped via misc: ${p.id} → ${p.misc.trim()}`);
      } else {
        // fallback to name match if misc missing
        const found = teamNameToId[p.name?.toLowerCase() ?? ""];
        if (found) {
          map[p.id] = found;
          console.log(`  ✅ Mapped via name: ${p.id} (${p.name}) → ${found}`);
        } else {
          console.warn(`  ⚠️ No mapping found for participant ${p.id} (${p.name})`);
        }
      }
    });

    console.log("✅ Built participant map:", map);
    console.log("🔢 Participant map size:", Object.keys(map).length);
    
    if (Object.keys(map).length === 0) {
      throw new Error("No participant mappings could be established. Check if teams were properly added to Challonge with misc field.");
    }
    
    return map;
    
  } catch (error) {
    console.error("❌ Error building participant map:", error);
    console.error("Error details:", error.message);
    if (error.stack) {
      console.error("Error stack:", error.stack);
    }
    throw new Error(`Failed to build participant map: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
