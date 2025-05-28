
import { ChallongeService } from '@/services/ChallongeService';
import { ChallongeTournament } from '@/services/challonge/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
        const { error: insertError } = await supabase.from("brackets").insert({
          title: name.trim(),
          division_id: divisionId,
          format,
          state: "pending",
          challonge_tournament_id: Number(tournament.id),
        });
        
        if (insertError) {
          // Challonge succeeded but Supabase failed
          toast({
            title: "Partial Success",
            description: "Challonge tournament created but local save failed. Tournament exists in Challonge but not in local database.",
            variant: "destructive"
          });
          throw new Error(`Local save failed: ${insertError.message}`);
        }
        
        localBracketInserted = true;
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
