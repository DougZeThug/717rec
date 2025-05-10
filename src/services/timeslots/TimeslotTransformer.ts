
import { TeamTimeslot, TimeslotGroup } from "@/types/timeslots";

export class TimeslotTransformer {
  /**
   * Format a single timeslot record from the database response
   */
  static formatSingleTimeslot(item: any): TeamTimeslot {
    return {
      ...item,
      teams: item.teams ? {
        id: item.teams.id,
        name: item.teams.name,
        logo_url: item.teams.logo_url,
        image_url: item.teams.image_url,
        divisionName: null
      } : undefined
    };
  }

  /**
   * Format an array of timeslot records from the database response
   */
  static formatTimeslotResponse(data: any[]): TeamTimeslot[] {
    return data?.map(item => this.formatSingleTimeslot(item)) || [];
  }

  /**
   * Group timeslots by timeslot value
   */
  static groupByTimeslot(timeslots: TeamTimeslot[]): TimeslotGroup {
    const grouped = timeslots.reduce((acc: TimeslotGroup, curr) => {
      if (!curr.timeslot) return acc;
      
      if (!acc[curr.timeslot]) {
        acc[curr.timeslot] = [];
      }
      
      acc[curr.timeslot].push(curr);
      return acc;
    }, {});
    
    // Sort the timeslots object by keys (time values)
    const sortedGrouped = Object.keys(grouped)
      .sort()
      .reduce((acc: TimeslotGroup, key) => {
        acc[key] = grouped[key];
        return acc;
      }, {});
    
    return sortedGrouped;
  }
}
