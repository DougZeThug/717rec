
import { TeamTimeslot } from "@/types/timeslots";

export class TimeslotTransformer {
  /**
   * Transform raw database response to TeamTimeslot format
   * Enhanced to handle back-to-back scheduling fields
   */
  static formatTimeslotResponse(data: any[]): TeamTimeslot[] {
    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data.map(item => this.formatSingleTimeslot(item));
  }

  /**
   * Transform single timeslot record
   * Enhanced to handle back-to-back scheduling fields
   */
  static formatSingleTimeslot(item: any): TeamTimeslot {
    return {
      id: item.id,
      match_date: item.match_date,
      timeslot: item.timeslot,
      team_id: item.team_id,
      created_at: item.created_at,
      is_back_to_back: item.is_back_to_back || false,
      pair_slot: item.pair_slot || null,
      match_sequence: item.match_sequence || null,
      teams: item.teams ? {
        id: item.teams.id,
        name: item.teams.name,
        logo_url: item.teams.logo_url,
        image_url: item.teams.image_url,
        divisionName: null // Will be populated separately if needed
      } : undefined
    };
  }

  /**
   * Group timeslots by back-to-back pairs
   */
  static groupByBackToBackPairs(timeslots: TeamTimeslot[]) {
    const pairs: Record<string, { primary: TeamTimeslot[], secondary: TeamTimeslot[], pairLabel: string }> = {};
    
    timeslots.forEach(slot => {
      if (!slot.is_back_to_back) return;
      
      // Determine pair name based on timeslot
      let pairName: string;
      let pairLabel: string;
      
      if (slot.timeslot === '6:30 PM' || slot.timeslot === '7:00 PM') {
        pairName = 'Early';
        pairLabel = 'Early Pair (6:30-7:00 PM)';
      } else if (slot.timeslot === '7:30 PM' || slot.timeslot === '8:00 PM') {
        pairName = 'Mid';
        pairLabel = 'Mid Pair (7:30-8:00 PM)';
      } else if (slot.timeslot === '8:30 PM' || slot.timeslot === '9:00 PM') {
        pairName = 'Late';
        pairLabel = 'Late Pair (8:30-9:00 PM)';
      } else {
        return; // Skip invalid timeslots
      }
      
      if (!pairs[pairName]) {
        pairs[pairName] = { primary: [], secondary: [], pairLabel };
      }
      
      // Determine if this is primary (first) or secondary (second) slot
      const isPrimary = slot.match_sequence === 1;
      if (isPrimary) {
        pairs[pairName].primary.push(slot);
      } else {
        pairs[pairName].secondary.push(slot);
      }
    });
    
    return pairs;
  }
}
