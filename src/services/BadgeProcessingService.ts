import { supabase } from '@/integrations/supabase/client';
import { badgeLog, errorLog } from '@/utils/logger';

export class BadgeProcessingService {
  /**
   * Process all badges for both teams after a match is completed
   */
  static async processMatchBadges(team1Id: string, team2Id: string): Promise<any> {
    try {
      badgeLog('Processing match badges for teams:', team1Id, team2Id);

      const { data, error } = await supabase.rpc('process_match_badges', {
        p_team1_id: team1Id,
        p_team2_id: team2Id,
      });

      if (error) {
        errorLog('Error processing match badges:', error);
        throw error;
      }

      badgeLog('Badge processing complete');
      return data;
    } catch (error) {
      errorLog('Badge processing service error:', error);
      throw error;
    }
  }

  /**
   * Process kingslayer badge for a specific match
   */
  static async processKingslayerBadge(winnerId: string, loserId: string): Promise<any> {
    try {
      badgeLog('Processing kingslayer badge:', winnerId, 'defeated', loserId);

      const { data, error } = await supabase.rpc('award_kingslayer_badge', {
        p_winner_id: winnerId,
        p_loser_id: loserId,
      });

      if (error) {
        errorLog('Error processing kingslayer badge:', error);
        throw error;
      }

      badgeLog('Kingslayer badge processed');
      return data;
    } catch (error) {
      errorLog('Kingslayer badge processing error:', error);
      throw error;
    }
  }

  /**
   * Process clutch performer badge for a specific team after a 2-1 match win
   */
  static async processClutchPerformerBadge(
    winnerId: string,
    team1GameWins: number,
    team2GameWins: number
  ): Promise<any> {
    try {
      // Check if this was a 2-1 victory
      const isClutchWin =
        (team1GameWins === 2 && team2GameWins === 1) ||
        (team1GameWins === 1 && team2GameWins === 2);

      if (!isClutchWin) {
        badgeLog('Not a 2-1 match, skipping clutch performer');
        return { awarded: false, reason: 'Not a 2-1 match' };
      }

      badgeLog('Processing clutch performer badge for:', winnerId);

      const { data, error } = await supabase.rpc('award_clutch_performer_badge', {
        p_team_id: winnerId,
      });

      if (error) {
        errorLog('Error processing clutch performer badge:', error);
        throw error;
      }

      badgeLog('Clutch performer badge processed');
      return data;
    } catch (error) {
      errorLog('Clutch performer badge processing error:', error);
      throw error;
    }
  }

  /**
   * Process consistent performer badge for a specific team after a win
   */
  static async processConsistentPerformerBadge(winnerId: string): Promise<any> {
    try {
      badgeLog('Processing consistent performer badge for:', winnerId);

      const { data, error } = await supabase.rpc('award_consistent_performer_badge', {
        p_team_id: winnerId,
      });

      if (error) {
        errorLog('Error processing consistent performer badge:', error);
        throw error;
      }

      badgeLog('Consistent performer badge processed');
      return data;
    } catch (error) {
      errorLog('Consistent performer badge processing error:', error);
      throw error;
    }
  }

  /**
   * Calculate current streak for a specific team
   */
  static async calculateTeamStreak(
    teamId: string
  ): Promise<{ streak_type: string; streak_count: number } | null> {
    try {
      const { data, error } = await supabase.rpc('calculate_team_streak', {
        p_team_id: teamId,
      });

      if (error) {
        errorLog('Error calculating team streak:', error);
        throw error;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      errorLog('Team streak calculation error:', error);
      throw error;
    }
  }

  /**
   * Award streak badges for a specific team
   */
  static async awardStreakBadges(teamId: string): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('award_streak_badges', {
        p_team_id: teamId,
      });

      if (error) {
        errorLog('Error awarding streak badges:', error);
        throw error;
      }

      return data;
    } catch (error) {
      errorLog('Streak badge awarding error:', error);
      throw error;
    }
  }

  // =========================================================================
  // FUN BADGES
  // =========================================================================

  /**
   * Process Ice Cold badge - 3 consecutive 2-1 wins
   */
  static async processIceColdBadge(teamId: string): Promise<any> {
    try {
      badgeLog('Processing Ice Cold badge for:', teamId);

      const { data, error } = await supabase.rpc('award_ice_cold_badge', {
        p_team_id: teamId,
      });

      if (error) {
        errorLog('Error processing Ice Cold badge:', error);
        throw error;
      }

      badgeLog('Ice Cold badge processed:', data);
      return data;
    } catch (error) {
      errorLog('Ice Cold badge processing error:', error);
      throw error;
    }
  }

  /**
   * Process Broom Crew badge - 3 consecutive sweeps (2-0 wins)
   */
  static async processBroomCrewBadge(teamId: string): Promise<any> {
    try {
      badgeLog('Processing Broom Crew badge for:', teamId);

      const { data, error } = await supabase.rpc('award_broom_crew_badge', {
        p_team_id: teamId,
      });

      if (error) {
        errorLog('Error processing Broom Crew badge:', error);
        throw error;
      }

      badgeLog('Broom Crew badge processed:', data);
      return data;
    } catch (error) {
      errorLog('Broom Crew badge processing error:', error);
      throw error;
    }
  }

  /**
   * Process Gatekeeper badge - beats 3+ teams with higher power score
   */
  static async processGatekeeperBadge(teamId: string): Promise<any> {
    try {
      badgeLog('Processing Gatekeeper badge for:', teamId);

      const { data, error } = await supabase.rpc('award_gatekeeper_badge', {
        p_team_id: teamId,
      });

      if (error) {
        errorLog('Error processing Gatekeeper badge:', error);
        throw error;
      }

      badgeLog('Gatekeeper badge processed:', data);
      return data;
    } catch (error) {
      errorLog('Gatekeeper badge processing error:', error);
      throw error;
    }
  }

  /**
   * Process Chaos Agent badge - alternating W/L for 6+ matches
   */
  static async processChaosAgentBadge(teamId: string): Promise<any> {
    try {
      badgeLog('Processing Chaos Agent badge for:', teamId);

      const { data, error } = await supabase.rpc('award_chaos_agent_badge', {
        p_team_id: teamId,
      });

      if (error) {
        errorLog('Error processing Chaos Agent badge:', error);
        throw error;
      }

      badgeLog('Chaos Agent badge processed:', data);
      return data;
    } catch (error) {
      errorLog('Chaos Agent badge processing error:', error);
      throw error;
    }
  }

  /**
   * Process Bully badge - 4+ game wins against teams with 20+ lower division weight
   */
  static async processBullyBadge(teamId: string): Promise<any> {
    try {
      badgeLog('Processing Bully badge for:', teamId);

      const { data, error } = await supabase.rpc('award_bully_badge', {
        p_team_id: teamId,
      });

      if (error) {
        errorLog('Error processing Bully badge:', error);
        throw error;
      }

      badgeLog('Bully badge processed:', data);
      return data;
    } catch (error) {
      errorLog('Bully badge processing error:', error);
      throw error;
    }
  }
}
