
import { ChallongeService } from '@/services/ChallongeService';
import { ChallongeTournament } from '@/services/challonge/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { syncChallongeMatches, buildParticipantMap } from '@/services/ChallongeMatchSync';

export function useChallongeAdmin() {
  const qc = useQueryClient();

  const createBracket = useMutation({
    mutationFn: async ({ 
      name, 
      tournamentType, 
      teams,
      divisionId,
      format
    }: { 
      name: string; 
      tournamentType: "single elimination" | "double elimination"; 
      teams: { id: string; name: string; seed?: number }[];
      divisionId: string;
      format: string;
    }) => {
      let tournament: ChallongeTournament | null = null;
      let localBracketInserted = false;
      let bracketId: string | null = null;
      
      try {
        console.log("🎯 Starting bracket creation process...");
        console.log("Teams to add:", teams.map(t => ({ name: t.name, seed: t.seed, id: t.id })));
        
        // Step 1: Create Challonge tournament
        console.log("📝 Step 1: Creating Challonge tournament...");
        tournament = await ChallongeService.createTournament({
          name,
          tournamentType,
          description: `Tournament created for ${name}`
        });
        console.log("✅ Challonge tournament created with ID:", tournament.id);
        
        // Step 2: Add teams to Challonge tournament with proper seeding
        // Sort teams by seed to ensure proper order
        const sortedTeams = teams.sort((a, b) => (a.seed || 999) - (b.seed || 999));
        console.log("👥 Step 2: Adding teams to Challonge with seeds:", sortedTeams.map(t => ({ name: t.name, seed: t.seed })));
        
        const challongeParticipants = await ChallongeService.addTeamsToTournament(tournament.id.toString(), sortedTeams);
        console.log("✅ Added participants to Challonge:", challongeParticipants.length);
        
        // Step 3: Start Challonge tournament
        console.log("🚀 Step 3: Starting Challonge tournament...");
        await ChallongeService.startTournament(tournament.id.toString());
        console.log("✅ Challonge tournament started");
        
        // Step 4: Save bracket to local database
        console.log("💾 Step 4: Saving bracket to local database...");
        const { data: bracketData, error: insertError } = await supabase
          .from("brackets")
          .insert({
            title: name.trim(),
            division_id: divisionId,
            format,
            state: "pending",
            challonge_tournament_id: Number(tournament.id),
          })
          .select()
          .single();
        
        if (insertError || !bracketData) {
          console.error("❌ Local bracket save failed:", insertError);
          toast({
            title: "Partial Success",
            description: "Challonge tournament created but local save failed. Tournament exists in Challonge but not in local database.",
            variant: "destructive"
          });
          throw new Error(`Local save failed: ${insertError?.message || 'No bracket data returned'}`);
        }
        
        localBracketInserted = true;
        bracketId = bracketData.id;
        console.log("✅ Local bracket saved with ID:", bracketId);
        
        // Step 4.5: Create local participants
        console.log("👤 Step 4.5: Creating local participants...");
        try {
          for (const team of sortedTeams) {
            const { error: participantError } = await supabase
              .from('participants')
              .insert({
                bracket_id: bracketId,
                team_id: team.id,
                position: team.seed || 1,
                name: team.name
              });
            
            if (participantError) {
              console.error("⚠️ Error creating participant for team:", team.name, participantError);
            } else {
              console.log("✅ Created participant for:", team.name, "with seed:", team.seed);
            }
          }
          console.log("✅ All local participants created");
        } catch (participantError) {
          console.error("❌ Failed to create local participants:", participantError);
          // Don't throw here - participants are not critical for the match sync
        }
        
        // Step 5: Sync matches from Challonge to local database
        try {
          console.log("🔄 Step 5: Syncing matches from Challonge to local database...");
          
          // Build participant map - use the teams we just added
          console.log("🗺️ Building participant map...");
          const participantMap = await buildParticipantMap(sortedTeams, tournament.id.toString());
          console.log("✅ Participant map built:", Object.keys(participantMap).length, "entries");
          console.log("Participant map details:", participantMap);
          
          // Sync matches
          console.log("⚽ Syncing matches...");
          await syncChallongeMatches(tournament.id, bracketId, participantMap);
          console.log("✅ Matches synced successfully");
          
          toast({
            title: "Bracket Created Successfully",
            description: `"${name}" has been created with ${teams.length} teams and matches synced from Challonge.`,
          });
          
        } catch (syncError) {
          console.error("❌ Match sync failed with detailed error:", syncError);
          console.error("Error stack:", syncError.stack);
          toast({
            title: "Bracket Created with Sync Error",
            description: `Bracket was created but match sync failed: ${syncError.message || 'Unknown error'}. Check console for details.`,
            variant: "destructive"
          });
          // Don't throw here - the bracket was created successfully
        }
        
        return tournament;
        
      } catch (error: any) {
        console.error("❌ Bracket creation failed at some step:", error);
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
        
        // Determine which step failed and provide appropriate error handling
        if (tournament && !localBracketInserted) {
          // Challonge operations succeeded, but local save failed
          toast({
            title: "Challonge Created, Local Save Failed",
            description: "Tournament was created in Challonge but could not be saved locally. Check your database connection.",
            variant: "destructive"
          });
        } else if (tournament && localBracketInserted) {
          // This shouldn't happen in our current flow, but handle edge cases
          // where something fails after both Challonge and local save succeeded
          toast({
            title: "Unexpected Error",
            description: "Tournament created successfully but an unexpected error occurred.",
            variant: "destructive"
          });
        } else {
          // Challonge operations failed early
          if (error.message?.includes('Challonge')) {
            toast({
              title: "Challonge Tournament Creation Failed",
              description: "Failed to create tournament in Challonge. Please check your API key and try again.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Tournament Creation Failed", 
              description: error.message || "An unexpected error occurred during tournament creation.",
              variant: "destructive"
            });
          }
        }
        
        // Re-throw to maintain mutation failure state
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brackets'] });
      qc.invalidateQueries({ queryKey: ['challonge-bracket'] });
      qc.invalidateQueries({ queryKey: ['playoff-matches'] });
    },
  });

  const reportMatch = useMutation({
    mutationFn: async ({
      tournamentId,
      matchId,
      scoresCsv,
      winnerId,
    }: {
      tournamentId: string;
      matchId: string;
      scoresCsv: string;
      winnerId: string;
    }) => {
      try {
        return await ChallongeService.updateMatch({
          tournamentId,
          matchId,
          scoresCsv,
          winnerId,
        });
      } catch (error: any) {
        toast({
          title: "Match Update Failed",
          description: `Failed to update match in Challonge: ${error.message}`,
          variant: "destructive"
        });
        throw error;
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['challonge-bracket', vars.tournamentId] });
      qc.invalidateQueries({ queryKey: ['matches', vars.matchId] });
    },
  });

  const resyncMatches = useMutation({
    mutationFn: async ({
      bracketId,
      challongeTournamentId
    }: {
      bracketId: string;
      challongeTournamentId: number;
    }) => {
      try {
        console.log("🔄 Resyncing matches from Challonge...");
        
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
          throw new Error(`Failed to fetch bracket: ${bracketError?.message || 'Bracket not found'}`);
        }
        
        // Get teams in this division
        const { data: teams, error: teamsError } = await supabase
          .from('teams')
          .select('id, name')
          .eq('division_id', bracket.division_id);
          
        if (teamsError) {
          throw new Error(`Failed to fetch teams: ${teamsError.message}`);
        }
        
        // Build participant map
        const participantMap = await buildParticipantMap(teams || [], challongeTournamentId.toString());
        
        // Delete existing playoff matches for this bracket
        const { error: deleteError } = await supabase
          .from('playoff_matches')
          .delete()
          .eq('bracket_id', bracketId);
          
        if (deleteError) {
          throw new Error(`Failed to clear existing matches: ${deleteError.message}`);
        }
        
        // Sync matches from Challonge
        await syncChallongeMatches(challongeTournamentId, bracketId, participantMap);
        
        return { success: true };
        
      } catch (error: any) {
        console.error("Match resync failed:", error);
        throw new Error(`Failed to resync matches: ${error.message}`);
      }
    },
    onSuccess: () => {
      toast({
        title: "Matches Resynced Successfully",
        description: "All matches have been resynced from Challonge.",
      });
      qc.invalidateQueries({ queryKey: ['brackets'] });
      qc.invalidateQueries({ queryKey: ['playoff-matches'] });
      qc.invalidateQueries({ queryKey: ['challonge-bracket'] });
    },
    onError: (error: any) => {
      toast({
        title: "Resync Failed",
        description: error.message || "Failed to resync matches from Challonge.",
        variant: "destructive"
      });
    }
  });

  return { createBracket, reportMatch, resyncMatches };
}
