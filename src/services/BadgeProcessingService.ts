import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';
import { badgeLog } from '@/utils/logger';

export class BadgeProcessingService {
  /**
   * Process all badges for both teams after a match is completed
   */
  static async processMatchBadges(team1Id: string, team2Id: string): Promise<any> {
    badgeLog('Processing match badges for teams:', team1Id, team2Id);

    const { data, error } = await supabase.rpc('process_match_badges', {
      p_team1_id: team1Id,
      p_team2_id: team2Id,
    });

    if (error) handleDatabaseError(error, 'Failed to process match badges');

    badgeLog('Badge processing complete');
    return data;
  }

  /**
   * Process kingslayer badge for a specific match
   */
  static async processKingslayerBadge(winnerId: string, loserId: string): Promise<any> {
    badgeLog('Processing kingslayer badge:', winnerId, 'defeated', loserId);

    const { data, error } = await supabase.rpc('award_kingslayer_badge', {
      p_winner_id: winnerId,
      p_loser_id: loserId,
    });

    if (error) handleDatabaseError(error, 'Failed to process kingslayer badge');

    badgeLog('Kingslayer badge processed');
    return data;
  }

  /**
   * Process clutch performer badge for a specific team after a 2-1 match win
   */
  static async processClutchPerformerBadge(
    winnerId: string,
    team1GameWins: number,
    team2GameWins: number
  ): Promise<any> {
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

    if (error) handleDatabaseError(error, 'Failed to process clutch performer badge');

    badgeLog('Clutch performer badge processed');
    return data;
  }

  /**
   * Process consistent performer badge for a specific team after a win
   */
  static async processConsistentPerformerBadge(winnerId: string): Promise<any> {
    badgeLog('Processing consistent performer badge for:', winnerId);

    const { data, error } = await supabase.rpc('award_consistent_performer_badge', {
      p_team_id: winnerId,
    });

    if (error) handleDatabaseError(error, 'Failed to process consistent performer badge');

    badgeLog('Consistent performer badge processed');
    return data;
  }

  /**
   * Calculate current streak for a specific team
   */
  static async calculateTeamStreak(
    teamId: string
  ): Promise<{ streak_type: string; streak_count: number } | null> {
    const { data, error } = await supabase.rpc('calculate_team_streak', {
      p_team_id: teamId,
    });

    if (error) handleDatabaseError(error, 'Failed to calculate team streak');

    return data && data.length > 0 ? data[0] : null;
  }

  /**
   * Award streak badges for a specific team
   */
  static async awardStreakBadges(teamId: string): Promise<any> {
    const { data, error } = await supabase.rpc('award_streak_badges', {
      p_team_id: teamId,
    });

    if (error) handleDatabaseError(error, 'Failed to award streak badges');

    return data;
  }

  // =========================================================================
  // FUN BADGES
  // =========================================================================

  /**
   * Process Ice Cold badge - 3 consecutive 2-1 wins
   */
  static async processIceColdBadge(teamId: string): Promise<any> {
    badgeLog('Processing Ice Cold badge for:', teamId);

    const { data, error } = await supabase.rpc('award_ice_cold_badge', {
      p_team_id: teamId,
    });

    if (error) handleDatabaseError(error, 'Failed to process Ice Cold badge');

    badgeLog('Ice Cold badge processed:', data);
    return data;
  }

  /**
   * Process Broom Crew badge - 3 consecutive sweeps (2-0 wins)
   */
  static async processBroomCrewBadge(teamId: string): Promise<any> {
    badgeLog('Processing Broom Crew badge for:', teamId);

    const { data, error } = await supabase.rpc('award_broom_crew_badge', {
      p_team_id: teamId,
    });

    if (error) handleDatabaseError(error, 'Failed to process Broom Crew badge');

    badgeLog('Broom Crew badge processed:', data);
    return data;
  }

  /**
   * Process Gatekeeper badge - beats 3+ teams with higher power score
   */
  static async processGatekeeperBadge(teamId: string): Promise<any> {
    badgeLog('Processing Gatekeeper badge for:', teamId);

    const { data, error } = await supabase.rpc('award_gatekeeper_badge', {
      p_team_id: teamId,
    });

    if (error) handleDatabaseError(error, 'Failed to process Gatekeeper badge');

    badgeLog('Gatekeeper badge processed:', data);
    return data;
  }

  /**
   * Process Chaos Agent badge - alternating W/L for 6+ matches
   */
  static async processChaosAgentBadge(teamId: string): Promise<any> {
    badgeLog('Processing Chaos Agent badge for:', teamId);

    const { data, error } = await supabase.rpc('award_chaos_agent_badge', {
      p_team_id: teamId,
    });

    if (error) handleDatabaseError(error, 'Failed to process Chaos Agent badge');

    badgeLog('Chaos Agent badge processed:', data);
    return data;
  }

  /**
   * Process Bully badge - 4+ game wins against teams with 20+ lower division weight
   */
  static async processBullyBadge(teamId: string): Promise<any> {
    badgeLog('Processing Bully badge for:', teamId);

    const { data, error } = await supabase.rpc('award_bully_badge', {
      p_team_id: teamId,
    });

    if (error) handleDatabaseError(error, 'Failed to process Bully badge');

    badgeLog('Bully badge processed:', data);
    return data;
  }
}
