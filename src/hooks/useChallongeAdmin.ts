
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { createBracket, type BracketCreationOptions } from '@/services/bracket-creator';
import { reportMatch, resyncMatches, type MatchReportOptions, type MatchResyncOptions } from '@/services/bracket-manager';

export function useChallongeAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const createBracketMutation = useMutation({
    mutationFn: (options: BracketCreationOptions) => createBracket(options),
    onSuccess: (bracketId, variables) => {
      toast({
        title: "Bracket Created Successfully",
        description: `"${variables.name}" has been created with ${variables.teams.length} teams and matches synced from Challonge.`,
      });
      
      // Invalidate all related queries
      qc.invalidateQueries({ queryKey: ['brackets'] });
      qc.invalidateQueries({ queryKey: ['challonge-bracket'] });
      qc.invalidateQueries({ queryKey: ['playoff-matches'] });
    },
    onError: (error: Error, variables) => {
      if (error.message?.includes('Challonge Created, Local Save Failed')) {
        toast({
          title: "Challonge Created, Local Save Failed",
          description: "Tournament was created in Challonge but could not be saved locally. Check your database connection.",
          variant: "destructive"
        });
      } else if (error.message?.includes('Challonge')) {
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
    },
  });

  const reportMatchMutation = useMutation({
    mutationFn: (options: MatchReportOptions) => reportMatch(options),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['challonge-bracket', vars.tournamentId] });
      qc.invalidateQueries({ queryKey: ['matches', vars.matchId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Match Update Failed",
        description: `Failed to update match in Challonge: ${error.message}`,
        variant: "destructive"
      });
    },
  });

  const resyncMatchesMutation = useMutation({
    mutationFn: (options: MatchResyncOptions) => resyncMatches(options),
    onSuccess: () => {
      toast({
        title: "Matches Resynced Successfully",
        description: "All matches have been resynced from Challonge.",
      });
      qc.invalidateQueries({ queryKey: ['brackets'] });
      qc.invalidateQueries({ queryKey: ['playoff-matches'] });
      qc.invalidateQueries({ queryKey: ['challonge-bracket'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Resync Failed",
        description: error.message || "Failed to resync matches from Challonge.",
        variant: "destructive"
      });
    }
  });

  return { 
    createBracket: createBracketMutation,
    reportMatch: reportMatchMutation,
    resyncMatches: resyncMatchesMutation
  };
}
