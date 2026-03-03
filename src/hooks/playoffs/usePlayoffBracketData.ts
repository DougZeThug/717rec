import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { bracketLog, errorLog } from '@/utils/logger';
import type { BracketState, PlayoffBracket } from '@/utils/playoffs/playoffTypes';

// Helper to normalize bracket state - handles both legacy and current DB values
const computeBracketState = (state: string): BracketState =>
  state === 'in_progress' || state === 'underway'
    ? 'in_progress'
    : state === 'completed' || state === 'complete'
      ? 'completed'
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
        .select(
          'id, title, format, state, division_id, challonge_tournament_id, uses_brackets_manager, created_at, wb_champion_id, bracket_data, migrated, migrated_at, reset_match_needed'
        )
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

      bracketLog('usePlayoffBracketData: Final bracket result:', bracket);
      return bracket;
    },
    enabled: true,
  });
};
