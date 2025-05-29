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
      teams: { id: string; name: string }[];
      divisionId: string;
      format: string;
    }) => {
      let tournament: ChallongeTournament | null = null;
      let localBracketInserted = false;
      let bracketId: string | null = null;
      
      try {
        // Step 1: Create Challonge tournament
        tournament = await ChallongeService.createTournament({
          name,
          tournamentType,
          description: `Tournament created for ${name}`
        });
        
        // Step 2: Add teams to Challonge tournament
        await ChallongeService.addTeamsToTournament(tournament.id.toString(), teams);
        
        // Step 3: Start Challonge tournament
        await ChallongeService.startTournament(tournament.id.toString());
        
        // Step 4: Save bracket to local database
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
          // Challonge succeeded but Supabase failed
          toast({
            title: "Partial Success",
            description: "Challonge tournament created but local save failed. Tournament exists in Challonge but not in local database.",
            variant: "destructive"
          });
          throw new Error(`Local save failed: ${insertError?.message || 'No bracket data returned'}`);
        }
        
        localBracketInserted = true;
        bracketId = bracketData.id;
        
        // Step 5: Sync matches from Challonge to local database
        try {
          console.log("🔄 Syncing matches from Challonge to local database...");
          
          // Build participant map
          const participantMap = await buildParticipantMap(teams, tournament.id.toString());
          
          // Sync matches
          await syncChallongeMatches(tournament.id, bracketId, participantMap);
          
          toast({
            title: "Bracket Created Successfully",
            description: `"${name}" has been created with ${teams.length} teams and matches synced from Challonge.`,
          });
          
        } catch (syncError) {
          console.error("Match sync failed:", syncError);
          toast({
            title: "Bracket Created with Warning",
            description: "Bracket was created but some matches may not have synced properly. You can view the bracket in Challonge.",
            variant: "destructive"
          });
          // Don't throw here - the bracket was created successfully
        }
        
        return tournament;
        
      } catch (error: any) {
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

  return { createBracket, reportMatch };
}
