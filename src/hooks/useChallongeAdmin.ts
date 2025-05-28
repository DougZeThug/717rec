
import { ChallongeService } from '@/services/ChallongeService';
import { ChallongeTournament } from '@/services/challonge/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";

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
      const tournament = await ChallongeService.createTournament({
        name,
        tournamentType,
        description: `Tournament created for ${name}`
      });
      
      await ChallongeService.addTeamsToTournament(tournament.id.toString(), teams);
      await ChallongeService.startTournament(tournament.id.toString());
      
      // Save bracket to local database
      const { error: insertError } = await supabase.from("brackets").insert({
        title: name.trim(),
        division_id: divisionId,
        format,
        state: "pending",
        challonge_tournament_id: Number(tournament.id),
      });
      if (insertError) throw new Error(`Local save failed: ${insertError.message}`);
      
      return tournament as ChallongeTournament;
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
    }) => ChallongeService.updateMatch({
      tournamentId,
      matchId,
      scoresCsv,
      winnerId,
    }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['challonge-bracket', vars.tournamentId] });
      qc.invalidateQueries({ queryKey: ['matches', vars.matchId] });
    },
  });

  return { createBracket, reportMatch };
}
