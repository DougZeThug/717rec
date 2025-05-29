
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BracketMeta } from "@/types/bracket";
import type { PlayoffBracket, BracketState } from "@/types/playoffs";

// Helper to compute bracket state
const computeBracketState = (state: string): BracketState =>
  state === 'underway' ? 'in_progress'
  : state === 'complete' ? 'completed'
  : 'pending';

// Normalization function to convert Supabase rows to PlayoffBracket objects
const mapRowToBracket = (row: any): PlayoffBracket => ({
  ...row,
  name: row.title,
  matches: Array.isArray(row.matches) ? row.matches : [],
  state: computeBracketState(row.state),
});

export const usePlayoffBracketData = (bracketId: string | null) => {
  return useQuery({
    queryKey: ['bracket', bracketId],
    queryFn: async (): Promise<PlayoffBracket | null> => {
      if (!bracketId) return null;
      
      const { data, error } = await supabase
        .from('brackets')
        .select('*')
        .eq('id', bracketId)
        .single();
        
      if (error) throw error;
      
      const bracket = mapRowToBracket(data);
      
      // Calculate and update the bracket state if needed
      const calculatedState = computeBracketState(bracket.state);
      if (bracket.state !== calculatedState) {
        // Update the bracket state in the database
        await supabase
          .from('brackets')
          .update({ state: calculatedState })
          .eq('id', bracketId);
        
        // Update the local state
        bracket.state = calculatedState as BracketState;
      }
      
      return bracket;
    },
    enabled: !!bracketId
  });
};
