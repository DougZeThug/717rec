// Team related types
export interface Team {
  id: string;
  name: string;
  wins?: number;
  losses?: number;
  game_wins?: number;
  game_losses?: number;
  divisionName?: string;
  division_id?: string;
  division?: string;
  imageUrl?: string;
  logoUrl?: string;
  players?: string[];
  seed?: number;
  
  power_score?: number;
  sos?: number;
  win_percentage?: number;
  game_win_percentage?: number;
  created_at?: string;
  close_match_losses?: number;
}

// Match related types
export interface Match {
  id: string;
  team1Id: string;
  team2Id: string;
  team1Score?: number;
  team2Score?: number;
  winnerId?: string;
  loserId?: string;
  date?: string;
  location?: string;
  iscompleted?: boolean;
  round_number?: number;
  position?: number;
  bracket_id?: string;
  match_type?: string;
  next_match_id?: string;
  next_loser_match_id?: string;
  best_of?: number;
  team1_game_wins?: number;
  team2_game_wins?: number;
  created_at?: string;
  status?: 'postponed' | 'canceled' | null;
  timeSlot?: string | null;
  team1Details?: {
    team_id: string;
    name: string;
    image_url: string | null;
    logo_url: string | null;
    divisionName: string | null;
    division_id: string | null;
    power_score: number | null;
    sos: number | null;
  } | null;
  team2Details?: {
    team_id: string;
    name: string;
    image_url: string | null;
    logo_url: string | null;
    divisionName: string | null;
    division_id: string | null;
    power_score: number | null;
    sos: number | null;
  } | null;
}

// Head to Head types
export interface HeadToHeadEntry {
  opponentName: string;
  wins: number;
  losses: number;
}

export interface HeadToHeadMap {
  [teamId: string]: HeadToHeadEntry;
}

// Rankings related types
export interface Ranking {
  teamId: string;
  teamName: string;
  logoUrl?: string | null;
  imageUrl?: string | null;
  wins: number;
  losses: number;
  winPercentage: number;
  gamesWon: number;
  gamesLost: number;
  gameWinPercentage: number;
  sos: number;
  powerScore: number;
  streak?: string;
  rankChange?: number;
  previousRank?: number;
  divisionName?: string | null;
  headToHead: HeadToHeadMap;
  closeMatchLosses: number;
  divisionRank?: number;
}

// Types for playoff brackets - Export from the centralized file
export * from '@/utils/playoffs/playoffTypes';

// Export bracket record types
export * from './bracketRecord';

// Export specific types from bracket.ts (excluding BracketFormat to avoid conflict)
export type {
  BracketCreationRequest,
  BracketMeta,
  BracketOperationResult,
  MatchStatus,
  MatchType,
  PlayoffMatchSimple,
  TeamBase,
} from './bracket';

// Division type - updated to include display_division
export interface Division {
  id: string;
  name: string;
  division_weight?: number;
  display_division?: string;
  created_at?: string;
}


export * from './admin';
export type {
  BadgeMetadata,
  ChampionshipBadgeMetadata,
  KingSlayerBadgeMetadata,
  PerformanceBadgeMetadata,
  StreakBadgeMetadata,
} from './badges';
export type {
  BracketGroup,
  BracketMatch,
  BracketParticipant,
  BracketRound,
  BracketStage,
  DatabaseMatch,
  OpponentSlot,
} from './bracket';
export * from './career';
export * from './chart';
export * from './match';
export * from './playoff';
export * from './schedule';
export * from './season';

// Auto-schedule types
export * from './autoSchedule';

// Message board / reactions types
export * from './reactions';

// Hero card types
export * from './heroCard';

// Timeslot types
export type {
  BackToBackAssignmentOptions,
  BackToBackTimeslotGroup,
  TeamTimeslot,
  TimeslotFilterOptions,
  TimeslotGroup,
  TimeslotOperationResult,
} from './timeslots';

// Power score types
export * from './powerScoreSnapshot';
export * from './powerScoreTrends';

// Team advanced stats types
export * from './teamAdvancedStats';

// Dual block types
export * from './dualBlock';

// Head-to-head types
export * from './headToHead';

// Auth types
export * from './auth';

// User types
export * from './user';

// Team career power score types
export * from './teamCareerPowerScore';
