import { PlayoffMatch, Team } from '@/types';

export default interface MatchCardProps {
  match: PlayoffMatch;
  teams: Team[];
  onEditMatch?: (matchId: string) => void;
  hasNextMatch: boolean;
}

export interface MatchTeamProps {
  team: Team | null;
  teamId?: string | null;
  teamSeed: number;
  score?: number | null;
  isWinner: boolean;
  matchType: string;
}

export interface MatchHeaderProps {
  bestOf: number;
  seriesScore: string;
  position: number;
}

export interface MatchStatusProps {
  isPending: boolean;
  isComplete: boolean;
  isResetMatch: boolean;
  matchType: string;
  winnerId?: string | null;
}

import type { PlayoffGame } from '@/types';

export interface MatchGamesDotsProps {
  games: PlayoffGame[];
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null;
}

export interface ChampionProps {
  winner: Team | null;
}
