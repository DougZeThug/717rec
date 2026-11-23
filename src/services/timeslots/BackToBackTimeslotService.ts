import { supabase } from '@/integrations/supabase/client';
import { ValidationError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';

export const BackToBackTimeslotService = {
  /**
   * Delete a timeslot assignment (removes both slots in a back-to-back pair).
   */
  async deleteTimeslot(id: string): Promise<void> {
    const { data: timeslot, error: fetchError } = await supabase
      .from('team_timeslots')
      .select('team_id, match_date, is_back_to_back, pair_slot')
      .eq('id', id)
      .single();

    if (fetchError) handleDatabaseError(fetchError, 'Failed to fetch timeslot');
    if (!timeslot) throw new ValidationError(`Timeslot not found: ${id}`);

    if (timeslot.is_back_to_back) {
      const { error } = await supabase
        .from('team_timeslots')
        .delete()
        .eq('team_id', timeslot.team_id ?? '')
        .eq('match_date', timeslot.match_date)
        .eq('is_back_to_back', true);

      if (error) handleDatabaseError(error, 'Failed to delete back-to-back timeslots');
    } else {
      const { error } = await supabase.from('team_timeslots').delete().eq('id', id);
      if (error) handleDatabaseError(error, 'Failed to delete timeslot');
    }
  },
};
