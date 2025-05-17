
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
  players?: string[];
  wins?: number;
  losses?: number;
  game_wins?: number;
  game_losses?: number;
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
  loser_id?: string;
  date?: string;
  location?: string;
  iscompleted?: boolean;
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
  matchId: string;
  gameNumber: number;
  team1Score: number;
  team2Score: number;
  winnerId: string | null;
  winner?: "team1Id" | "team2Id" | null;
}

export interface PlayoffBracket {
  id: string;
  title: string;
  format: string;
  division?: string;
  matches: PlayoffMatch[];
  state?: BracketState;
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

export type {
  MatchFormProps,
  MatchFormValues,
  TeamSelectorProps
}
