
import { supabase } from '@/integrations/supabase/client';

export class BadgeProcessingService {
  /**
   * Process streak badges for both teams after a match is completed
   */
  static async processMatchBadges(team1Id: string, team2Id: string): Promise<any> {
    try {
      console.log('🏆 Processing match badges for teams:', { team1Id, team2Id });
      
      const { data, error } = await supabase.rpc('process_match_badges', {
        p_team1_id: team1Id,
        p_team2_id: team2Id
      });

      if (error) {
        console.error('❌ Error processing match badges:', error);
        throw error;
      }

      console.log('✅ Badge processing result:', data);
      return data;
    } catch (error) {
      console.error('❌ Badge processing service error:', error);
      throw error;
    }
  }

  /**
   * Calculate current streak for a specific team
   */
  static async calculateTeamStreak(teamId: string): Promise<{ streak_type: string; streak_count: number } | null> {
    try {
      const { data, error } = await supabase.rpc('calculate_team_streak', {
        p_team_id: teamId
      });

      if (error) {
        console.error('❌ Error calculating team streak:', error);
        throw error;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('❌ Team streak calculation error:', error);
      throw error;
    }
  }

  /**
   * Award streak badges for a specific team
   */
  static async awardStreakBadges(teamId: string): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('award_streak_badges', {
        p_team_id: teamId
      });

      if (error) {
        console.error('❌ Error awarding streak badges:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Streak badge awarding error:', error);
      throw error;
    }
  }
}
