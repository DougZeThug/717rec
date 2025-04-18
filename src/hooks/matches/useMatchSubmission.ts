
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Match } from "@/types";

export const useMatchSubmission = () => {
  const { toast } = useToast();

  const handleSubmitScore = async (matchId: string, team1Score: number, team2Score: number) => {
    try {
      let winnerId: string | null = null;
      let loserId: string | null = null;
      
      if (team1Score > team2Score) {
        const match = await supabase
          .from('matches')
          .select('team1_id, team2_id')
          .eq('id', matchId)
          .single();
          
        if (match.data) {
          winnerId = match.data.team1_id;
          loserId = match.data.team2_id;
        }
      } else if (team2Score > team1Score) {
        const match = await supabase
          .from('matches')
          .select('team1_id, team2_id')
          .eq('id', matchId)
          .single();
          
        if (match.data) {
          winnerId = match.data.team2_id;
          loserId = match.data.team1_id;
        }
      }

      const { error } = await supabase
        .from('matches')
        .update({
          team1_score: team1Score,
          team2_score: team2Score,
          iscompleted: true,
          winner_id: winnerId,
          loser_id: loserId
        })
        .eq('id', matchId);

      if (error) throw error;

      toast({
        title: 'Scores Updated',
        description: 'Match scores have been successfully updated.',
      });
      
      return true;
    } catch (error) {
      console.error('Error updating scores:', error);
      toast({
        title: 'Error',
        description: 'Failed to update scores. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return { handleSubmitScore };
};
