/**
 * Schedule-related type definitions
 */

export interface ScheduledMatch {
  id: string;
  team1Id: string;
  team2Id: string;
  team1Name?: string;
  team2Name?: string;
  timeslot: string;
  date: Date | string;
  location?: string;
  blockType?: 'primary' | 'secondary';
  isBackToBack?: boolean;
}
