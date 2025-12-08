
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PlayoffBracket, BracketState } from "@/types/playoffs";
import { bracketLog, errorLog } from "@/utils/logger";

// Helper to compute bracket state
const computeBracketState = (state: string): BracketState =>
  state === 'underway' ? 'in_progress'
  : state === 'complete' ? 'completed'
  : 'pending';

// Normalization function to convert Supabase rows to PlayoffBracket objects
const mapRowToBracket = (row: any): PlayoffBracket => {
  bracketLog('mapRowToBracket: Raw row data:', row);
  
  const bracket = {
    ...row,
    name: row.title || row.name,
    matches: [],
    state: computeBracketState(row.state || 'pending'),
  };
  
  bracketLog('mapRowToBracket: Mapped bracket:', bracket);
  return bracket;
};

export const usePlayoffBracketData = (bracketId: string | null) => {
  return useQuery({
    queryKey: ['bracket', bracketId],
    queryFn: async (): Promise<PlayoffBracket | null> => {
      bracketLog('usePlayoffBracketData: Starting query for bracketId:', bracketId);
      
      if (!bracketId) {
        bracketLog('usePlayoffBracketData: No bracketId provided, returning null');
        return null;
      }
      
      bracketLog('usePlayoffBracketData: Fetching bracket data from database...');
      const { data, error } = await supabase
        .from('brackets')
        .select('*')
        .eq('id', bracketId)
        .single();
        
      if (error) {
        errorLog('usePlayoffBracketData: Database error:', error);
        throw error;
      }
      
      if (!data) {
        bracketLog('usePlayoffBracketData: No bracket found with id:', bracketId);
        return null;
      }
      
      bracketLog('usePlayoffBracketData: Raw database result:', data);
      
      const bracket = mapRowToBracket(data);
      
      // Calculate and update the bracket state if needed
      const calculatedState = computeBracketState(bracket.state);
      if (bracket.state !== calculatedState) {
        bracketLog('usePlayoffBracketData: Updating bracket state from', bracket.state, 'to', calculatedState);
        
        await supabase
          .from('brackets')
          .update({ state: calculatedState })
          .eq('id', bracketId);
        
        bracket.state = calculatedState as BracketState;
      }
      
      bracketLog('usePlayoffBracketData: Final bracket result:', bracket);
      return bracket;
    },
    enabled: true
  });
};
