import { format } from 'date-fns';

import { supabase } from '@/integrations/supabase/client';
import { TeamTimeslot } from '@/types/timeslots';
import { getBackToBackPairName, getPairConfig } from '@/utils/autoSchedule/constants';
import { handleDatabaseError } from '@/utils/errorHandler';
import { scheduleLog } from '@/utils/logger';

import { TimeslotTransformer } from './TimeslotTransformer';

interface TimeslotInsert {
  match_date: string;
  team_id: string;
  timeslot: string;
  is_back_to_back: boolean;
  is_double_header: boolean;
  pair_slot: string;
  match_sequence: number;
}

export class DoubleHeaderService {
  /**
   * Assign a double header to a single team (two separate back-to-back pairs).
   * Creates 4 timeslot entries: 2 for each back-to-back pair.
   * Example: slot1=6:00PM, slot2=7:00PM creates:
   *   - 6:00PM ↔ 6:30PM (first back-to-back pair)
   *   - 7:00PM ↔ 7:30PM (second back-to-back pair)
   */
  static async assignDoubleHeader(
    date: Date,
    teamId: string,
    slot1: string,
    slot2: string
  ): Promise<TeamTimeslot[]> {
    const formattedDate = format(date, 'yyyy-MM-dd');

    const pair1Name = getBackToBackPairName(slot1);
    const pair2Name = getBackToBackPairName(slot2);

    if (!pair1Name || !pair2Name) {
      throw new Error(`Invalid timeslots for double header: ${slot1} or ${slot2}`);
    }

    const pair1Config = getPairConfig(pair1Name);
    const pair2Config = getPairConfig(pair2Name);

    if (!pair1Config || !pair2Config) {
      throw new Error(`Could not find pair config for: ${pair1Name} or ${pair2Name}`);
    }

    const timeslotData: TimeslotInsert[] = [
      {
        match_date: formattedDate,
        team_id: teamId,
        timeslot: pair1Config.primary,
        is_back_to_back: true,
        is_double_header: true,
        pair_slot: pair1Config.secondary,
        match_sequence: 1,
      },
      {
        match_date: formattedDate,
        team_id: teamId,
        timeslot: pair1Config.secondary,
        is_back_to_back: true,
        is_double_header: true,
        pair_slot: pair1Config.primary,
        match_sequence: 2,
      },
      {
        match_date: formattedDate,
        team_id: teamId,
        timeslot: pair2Config.primary,
        is_back_to_back: true,
        is_double_header: true,
        pair_slot: pair2Config.secondary,
        match_sequence: 1,
      },
      {
        match_date: formattedDate,
        team_id: teamId,
        timeslot: pair2Config.secondary,
        is_back_to_back: true,
        is_double_header: true,
        pair_slot: pair2Config.primary,
        match_sequence: 2,
      },
    ];

    scheduleLog(
      `Adding double header timeslots for team ${teamId}: ${pair1Name} (${pair1Config.primary}/${pair1Config.secondary}) and ${pair2Name} (${pair2Config.primary}/${pair2Config.secondary})`,
      timeslotData
    );

    const { data, error } = await supabase
      .from('team_timeslots')
      .insert(timeslotData)
      .select('*, teams:team_id(id, name, logo_url, image_url)');

    if (error) handleDatabaseError(error, 'Failed to add double header timeslots');
    return TimeslotTransformer.formatTimeslotResponse(data ?? []);
  }

  /**
   * Batch assign double headers to multiple teams.
   * Each team gets 4 timeslot entries: 2 for each back-to-back pair.
   */
  static async batchAssignDoubleHeaders(
    date: Date,
    teamIds: string[],
    slot1: string,
    slot2: string
  ): Promise<TeamTimeslot[]> {
    const formattedDate = format(date, 'yyyy-MM-dd');

    const pair1Name = getBackToBackPairName(slot1);
    const pair2Name = getBackToBackPairName(slot2);

    if (!pair1Name || !pair2Name) {
      throw new Error(`Invalid timeslots for double header: ${slot1} or ${slot2}`);
    }

    const pair1Config = getPairConfig(pair1Name);
    const pair2Config = getPairConfig(pair2Name);

    if (!pair1Config || !pair2Config) {
      throw new Error(`Could not find pair config for: ${pair1Name} or ${pair2Name}`);
    }

    const allTimeslotData: TimeslotInsert[] = [];

    teamIds.forEach((teamId) => {
      allTimeslotData.push(
        {
          match_date: formattedDate,
          team_id: teamId,
          timeslot: pair1Config.primary,
          is_back_to_back: true,
          is_double_header: true,
          pair_slot: pair1Config.secondary,
          match_sequence: 1,
        },
        {
          match_date: formattedDate,
          team_id: teamId,
          timeslot: pair1Config.secondary,
          is_back_to_back: true,
          is_double_header: true,
          pair_slot: pair1Config.primary,
          match_sequence: 2,
        },
        {
          match_date: formattedDate,
          team_id: teamId,
          timeslot: pair2Config.primary,
          is_back_to_back: true,
          is_double_header: true,
          pair_slot: pair2Config.secondary,
          match_sequence: 1,
        },
        {
          match_date: formattedDate,
          team_id: teamId,
          timeslot: pair2Config.secondary,
          is_back_to_back: true,
          is_double_header: true,
          pair_slot: pair2Config.primary,
          match_sequence: 2,
        }
      );
    });

    scheduleLog(
      `Batch assigning double header timeslots for ${teamIds.length} teams: ${pair1Name} and ${pair2Name}`
    );

    const { data, error } = await supabase
      .from('team_timeslots')
      .insert(allTimeslotData)
      .select('*, teams:team_id(id, name, logo_url, image_url)');

    if (error) handleDatabaseError(error, 'Failed to batch assign double header timeslots');
    return TimeslotTransformer.formatTimeslotResponse(data ?? []);
  }
}
