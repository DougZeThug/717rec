import { format } from 'date-fns';

import { supabase } from '@/integrations/supabase/client';
import { TeamTimeslot } from '@/types/timeslots';
import { handleDatabaseError } from '@/utils/errorHandler';
import { getBackToBackPairName, getPairConfig } from '@/utils/autoSchedule/constants';
import { scheduleLog, warnLog } from '@/utils/logger';

import { TimeslotTransformer } from './TimeslotTransformer';

export class BackToBackTimeslotService {
  /**
   * Add a back-to-back timeslot assignment.
   * Always creates BOTH timeslots for the team.
   */
  static async addBackToBackTimeslot(
    date: Date,
    teamId: string,
    pairName: string
  ): Promise<TeamTimeslot[]> {
    const pairConfig = getPairConfig(pairName);
    if (!pairConfig) throw new Error(`Invalid pair name: ${pairName}`);

    const formattedDate = format(date, 'yyyy-MM-dd');

    const timeslotData = [
      {
        match_date: formattedDate,
        team_id: teamId,
        timeslot: pairConfig.primary,
        is_back_to_back: true,
        pair_slot: pairConfig.secondary,
        match_sequence: 1,
      },
      {
        match_date: formattedDate,
        team_id: teamId,
        timeslot: pairConfig.secondary,
        is_back_to_back: true,
        pair_slot: pairConfig.primary,
        match_sequence: 2,
      },
    ];

    scheduleLog(
      `Adding back-to-back timeslots for team ${teamId} in ${pairName} pair:`,
      timeslotData
    );

    const { data, error } = await supabase
      .from('team_timeslots')
      .insert(timeslotData)
      .select('*, teams:team_id(id, name, logo_url, image_url)');

    if (error) handleDatabaseError(error, 'Failed to add back-to-back timeslots');
    return TimeslotTransformer.formatTimeslotResponse(data ?? []);
  }

  /**
   * Legacy method — redirects to back-to-back assignment.
   * @deprecated Use addBackToBackTimeslot instead
   */
  static async addTimeslot(
    date: Date,
    teamId: string,
    timeslot: string
  ): Promise<TeamTimeslot[]> {
    warnLog('addTimeslot is deprecated. Converting to back-to-back assignment.');

    const pairName = getBackToBackPairName(timeslot);
    if (!pairName) throw new Error(`Cannot determine back-to-back pair for timeslot: ${timeslot}`);

    return BackToBackTimeslotService.addBackToBackTimeslot(date, teamId, pairName);
  }

  /**
   * Delete a timeslot assignment (removes both slots in a back-to-back pair).
   */
  static async deleteTimeslot(id: string): Promise<void> {
    const { data: timeslot, error: fetchError } = await supabase
      .from('team_timeslots')
      .select('team_id, match_date, is_back_to_back, pair_slot')
      .eq('id', id)
      .single();

    if (fetchError) handleDatabaseError(fetchError, 'Failed to fetch timeslot');

    if (timeslot!.is_back_to_back) {
      const { error } = await supabase
        .from('team_timeslots')
        .delete()
        .eq('team_id', timeslot!.team_id)
        .eq('match_date', timeslot!.match_date)
        .eq('is_back_to_back', true);

      if (error) handleDatabaseError(error, 'Failed to delete back-to-back timeslots');
    } else {
      const { error } = await supabase.from('team_timeslots').delete().eq('id', id);
      if (error) handleDatabaseError(error, 'Failed to delete timeslot');
    }
  }
}
