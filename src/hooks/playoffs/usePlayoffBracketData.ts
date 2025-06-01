
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
const mapRowToBracket = (row: any): PlayoffBracket => {
  console.log('🔄 mapRowToBracket: Raw row data:', row);
  
  const bracket = {
    ...row,
    name: row.title || row.name, // Map database 'title' to frontend 'name'
    matches: [], // Initialize empty - matches will be populated separately
    state: computeBracketState(row.state || 'pending'),
  };
  
  console.log('🔄 mapRowToBracket: Mapped bracket:', bracket);
  return bracket;
};

export const usePlayoffBracketData = (bracketId: string | null) => {
  return useQuery({
    queryKey: ['bracket', bracketId],
    queryFn: async (): Promise<PlayoffBracket | null> => {
      console.log('🎯 usePlayoffBracketData: Starting query for bracketId:', bracketId);
      
      if (!bracketId) {
        console.log('🎯 usePlayoffBracketData: No bracketId provided, returning null');
        return null;
      }
      
      console.log('🎯 usePlayoffBracketData: Fetching bracket data from database...');
      const { data, error } = await supabase
        .from('brackets')
        .select('*')
        .eq('id', bracketId)
        .single();
        
      if (error) {
        console.error('🎯 usePlayoffBracketData: Database error:', error);
        throw error;
      }
      
      if (!data) {
        console.log('🎯 usePlayoffBracketData: No bracket found with id:', bracketId);
        return null;
      }
      
      console.log('🎯 usePlayoffBracketData: Raw database result:', data);
      
      const bracket = mapRowToBracket(data);
      
      // Calculate and update the bracket state if needed
      const calculatedState = computeBracketState(bracket.state);
      if (bracket.state !== calculatedState) {
        console.log('🎯 usePlayoffBracketData: Updating bracket state from', bracket.state, 'to', calculatedState);
        
        // Update the bracket state in the database
        await supabase
          .from('brackets')
          .update({ state: calculatedState })
          .eq('id', bracketId);
        
        // Update the local state
        bracket.state = calculatedState as BracketState;
      }
      
      console.log('🎯 usePlayoffBracketData: Final bracket result:', bracket);
      return bracket;
    },
    enabled: !!bracketId
  });
};
