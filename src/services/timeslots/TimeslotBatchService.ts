import { format } from 'date-fns';

import { supabase } from '@/integrations/supabase/client';
import { TeamTimeslot } from '@/types/timeslots';
import { getBackToBackPairName, getPairConfig } from '@/utils/autoSchedule/constants';
import { handleDatabaseError } from '@/utils/errorHandler';
import { scheduleLog, warnLog } from '@/utils/logger';

import { TimeslotTransformer } from './TimeslotTransformer';

interface TimeslotInsert {
  match_date: string;
  team_id: string;
  timeslot: string;
  is_back_to_back: boolean;
  pair_slot: string;
  match_sequence: number;
}

export class TimeslotBatchService {
  /**
   * Batch assign multiple teams to the same back-to-back pair.
   */
  static async batchAssignBackToBackTimeslots(
    date: Date,
    teamIds: string[],
    pairName: string
  ): Promise<TeamTimeslot[]> {
    const pairConfig = getPairConfig(pairName);
    if (!pairConfig) throw new Error(`Invalid pair name: ${pairName}`);

    const formattedDate = format(date, 'yyyy-MM-dd');

    const allTimeslotData: TimeslotInsert[] = [];

    teamIds.forEach((teamId) => {
      allTimeslotData.push(
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
        }
      );
    });

    scheduleLog(
      `Batch assigning back-to-back timeslots for ${teamIds.length} teams in ${pairName} pair`
    );

    const { data, error } = await supabase
      .from('team_timeslots')
      .insert(allTimeslotData)
      .select('*, teams:team_id(id, name, logo_url, image_url)');

    if (error) handleDatabaseError(error, 'Failed to batch assign back-to-back timeslots');
    return TimeslotTransformer.formatTimeslotResponse(data ?? []);
  }

  /**
   * Legacy method — redirects to back-to-back batch assignment.
   * @deprecated Use batchAssignBackToBackTimeslots instead
   */
  static async batchAssignTimeslots(
    date: Date,
    teamIds: string[],
    timeslot: string
  ): Promise<TeamTimeslot[]> {
    warnLog('batchAssignTimeslots is deprecated. Converting to back-to-back batch assignment.');

    const pairName = getBackToBackPairName(timeslot);
    if (!pairName) throw new Error(`Cannot determine back-to-back pair for timeslot: ${timeslot}`);

    return TimeslotBatchService.batchAssignBackToBackTimeslots(date, teamIds, pairName);
  }

  /**
   * Insert a single timeslot (used by useTimeslotOperations.addTimeslot).
   */
  static async insertTimeslot(match_date: string, team_id: string, timeslot: string) {
    const { data, error } = await supabase
      .from('team_timeslots')
      .insert({ match_date, team_id, timeslot })
      .select('*, teams:team_id(id, name, logo_url)')
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a single timeslot by id.
   * Simple delete — does NOT handle back-to-back pair deletion.
   */
  static async deleteTimeslotSimple(id: string) {
    const { error } = await supabase.from('team_timeslots').delete().eq('id', id);
    if (error) throw error;
  }

  /**
   * Batch insert timeslots (used by useTimeslotOperations.batchAssignTimeslots).
   */
  static async batchInsertTimeslots(
    insertData: Array<{ match_date: string; team_id: string; timeslot: string }>
  ) {
    const { data, error } = await supabase
      .from('team_timeslots')
      .insert(insertData)
      .select('*, teams:team_id(id, name, logo_url)');

    if (error) throw error;
    return data ?? [];
  }
}
