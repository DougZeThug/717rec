import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

export interface CounterDriftRow {
  team_id: string;
  name: string;
  counter_wins: number;
  derived_wins: number;
  counter_losses: number;
  derived_losses: number;
  counter_game_wins: number;
  derived_game_wins: number;
  counter_game_losses: number;
  derived_game_losses: number;
}

export const DriftService = {
  /**
   * Fetch teams whose stored counters disagree with completed-match history.
   * Empty array means standings counters are in sync.
   */
  fetchDrift: async (): Promise<CounterDriftRow[]> => {
    const { data, error } = await supabase
      .from('v_counter_drift')
      .select(
        'team_id, name, counter_wins, derived_wins, counter_losses, derived_losses, counter_game_wins, derived_game_wins, counter_game_losses, derived_game_losses'
      );

    if (error) handleDatabaseError(error, 'Failed to fetch counter drift');
    return (data ?? []) as CounterDriftRow[];
  },

  /**
   * Admin-only. Rewrites teams counters from decided matches and refreshes
   * the season-stats cache. Returns the number of team rows repaired.
   */
  reconcile: async (): Promise<number> => {
    const { data, error } = await supabase.rpc('reconcile_team_counters');
    if (error) handleDatabaseError(error, 'Failed to reconcile counters');
    return typeof data === 'number' ? data : 0;
  },
};
