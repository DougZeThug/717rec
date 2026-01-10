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
}
