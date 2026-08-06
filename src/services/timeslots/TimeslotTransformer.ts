import { TeamTimeslot, TimeslotGroup } from '@/types/timeslots';

import { TimeslotRow } from './types';

export const TimeslotTransformer = {
  /**
   * Transform raw database response to TeamTimeslot format
   * Enhanced to handle back-to-back scheduling fields
   */
  formatTimeslotResponse(data: TimeslotRow[] | null | undefined): TeamTimeslot[] {
    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data.map((item) => TimeslotTransformer.formatSingleTimeslot(item));
  },

  /**
   * Transform single timeslot record
   * Enhanced to handle back-to-back scheduling fields
   */
  formatSingleTimeslot(item: TimeslotRow): TeamTimeslot {
    return {
      id: item.id,
      match_date: item.match_date,
      timeslot: item.timeslot ?? '',
      team_id: item.team_id ?? '',
      created_at: item.created_at ?? '',
      is_back_to_back: item.is_back_to_back || false,
      is_double_header: item.is_double_header || false,
      pair_slot: item.pair_slot || null,
      match_sequence: item.match_sequence || null,
      teams: item.teams
        ? {
            id: item.teams.id,
            name: item.teams.name ?? '',
            logo_url: item.teams.logo_url,
            image_url: item.teams.image_url,
            divisionName: null, // Will be populated separately if needed
          }
        : undefined,
    };
  },

  /**
   * Group timeslots by timeslot value (needed for backwards compatibility)
   */
  groupByTimeslot(timeslots: TeamTimeslot[]): TimeslotGroup {
    const grouped: TimeslotGroup = {};

    timeslots.forEach((slot) => {
      if (!grouped[slot.timeslot]) {
        grouped[slot.timeslot] = [];
      }
      grouped[slot.timeslot].push(slot);
    });

    return grouped;
  },
};
