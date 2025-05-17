
import { MatchFormProps, MatchFormValues, TeamSelectorProps } from "./match";

export interface UserProfile {
  id: string;
  user_id?: string;
  username?: string;
  full_name?: string;
  is_admin?: boolean;
  avatar_url?: string;
}

export interface Team {
  id: string;
  name: string;
  seed?: number;
  division_id?: string;
  divisionName?: string;
  imageUrl?: string;
  image_url?: string;
  logo_url?: string;
  logoUrl?: string;
  players?: string[];
  wins?: number;
  losses?: number;
  game_wins?: number;
  game_losses?: number;
  power_score?: number;
  sos?: number;
  division?: string;
  created_at?: string;
  win_percentage?: number;
  game_win_percentage?: number;
}

export interface Division {
  id: string;
  name: string;
}

export interface TimeSlot {
  id: string;
  timeslot: string;
  match_date: string;
  team_id: string;
}

export interface TeamTimeslot {
  id: string;
  timeslot: string;
  match_date: string;
  team_id: string;
  teams?: Team;
}

export interface Match {
  id: string;
  team1Id: string;
  team2Id: string;
  team1Score?: number;
  team2Score?: number;
  team1_game_wins?: number;
  team2_game_wins?: number;
  team1Details?: Team;
  team2Details?: Team;
  winner_id?: string;
  winnerId?: string;
  loser_id?: string;
  loserId?: string;
  date?: string;
  timeSlot?: string;
  location?: string;
  iscompleted?: boolean;
  best_of?: number;
  status?: "pending" | "in_progress" | "completed" | "postponed" | "canceled";
}

export interface Message {
  id: string;
  user_id: string;
  content: string;
  username: string;
  team_id?: string;
  team_name?: string;
  created_at: string;
  updated_at?: string;
  is_edited?: boolean;
  category?: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

export interface MessageCategory {
  value: string;
  label: string;
  description?: string;
}

export interface PlayoffMatch {
  id: string;
  round: number;
  position: number;
  matchType: "winners" | "losers" | "finals" | "play-in" | "play-in-2";
  team1Id: string | null;
  team2Id: string | null;
  team1Seed: number | null;
  team2Seed: number | null;
  team1Score: number | null;
  team2Score: number | null;
  winnerId: string | null;
  loserId: string | null;
  nextWinMatchId: string | null;
  nextLoseMatchId: string | null;
  bestOf: number;
  status: "pending" | "in_progress" | "completed";
  games?: PlayoffGame[];
}

export interface PlayoffGame {
  id: string;
  matchId?: string;
  gameNumber: number;
  team1Score: number;
  team2Score: number;
  winnerId: string | null;
  winner?: "team1Id" | "team2Id" | null;
}

export interface PlayoffBracket {
  id: string;
  title: string;
  name?: string;
  format: string;
  division?: string;
  matches: PlayoffMatch[];
  state?: BracketState;
  champion?: string;
}

export interface BracketState {
  isWinnersBracketComplete: boolean;
  isLosersBracketComplete: boolean;
  isResetMatchNeeded: boolean;
  isComplete: boolean;
  winnersBracketChampionId: string | null;
  losersBracketChampionId: string | null;
  championId: string | null;
}

// Rankings types
export interface HeadToHeadEntry {
  opponentId: string;
  opponentName: string;
  wins: number;
  losses: number;
}

export interface HeadToHeadMap {
  [teamId: string]: HeadToHeadEntry[];
}

export interface Ranking {
  teamId: string;
  teamName: string;
  divisionId?: string;
  divisionName?: string;
  wins: number;
  losses: number;
  gamesWon: number;
  gamesLost: number;
  winPercentage: number;
  gameWinPercentage: number;
  streak?: string;
  sos: number;
  powerScore: number;
  rank?: number;
  divisionRank?: number;
  rankChange?: number;
  previousRank?: number;
  headToHead?: HeadToHeadEntry[];
  closeMatchLosses?: number;
  logoUrl?: string;
  imageUrl?: string;
}

export type {
  MatchFormProps,
  MatchFormValues,
  TeamSelectorProps
}
