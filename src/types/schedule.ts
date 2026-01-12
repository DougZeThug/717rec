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

export interface ScheduleSlot {
  id: string;
  time: string;
  date: Date | string;
  isAvailable: boolean;
  matchId?: string;
}

export interface TeamStanding {
  placement: number;
  wins: number;
  losses: number;
  game_wins: number;
  game_losses: number;
  teams: {
    id: string;
    name: string;
    logo_url?: string | null;
    image_url?: string | null;
  };
}
