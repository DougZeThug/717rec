import { liveDb } from './liveDb';
import { handleLiveScoringError } from './LiveMatchService';

export interface FinalizeResult {
  applied: boolean;
  winnerId?: string;
  team1GameWins?: number;
  team2GameWins?: number;
  reason?: string;
}

export const FinalizeService = {
  /**
   * Writes the official match result from the completed live games via the
   * idempotent finalize_live_match RPC. `applied: false` means the match was
   * already resulted (by another scorer or an admin) — not an error.
   */
  finalizeLiveMatch: async (matchId: string): Promise<FinalizeResult> => {
    const { data, error } = await liveDb.rpc('finalize_live_match', { p_match_id: matchId });
    if (error) handleLiveScoringError(error, 'Failed to finalize match');

    const result = (data ?? {}) as Record<string, unknown>;
    return {
      applied: result.applied === true,
      winnerId: typeof result.winner_id === 'string' ? result.winner_id : undefined,
      team1GameWins:
        typeof result.team1_game_wins === 'number' ? result.team1_game_wins : undefined,
      team2GameWins:
        typeof result.team2_game_wins === 'number' ? result.team2_game_wins : undefined,
      reason: typeof result.reason === 'string' ? result.reason : undefined,
    };
  },

  /**
   * Admin-only: reverts the official result and team records (idempotently)
   * so rounds can be corrected and the match re-finalized. Returns false when
   * there was nothing to reverse.
   */
  reopenLiveMatch: async (matchId: string): Promise<boolean> => {
    const { data, error } = await liveDb.rpc('reopen_live_match', { p_match_id: matchId });
    if (error) handleLiveScoringError(error, 'Failed to reopen match');
    return data === true;
  },
};
