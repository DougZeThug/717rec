import { Match } from '@/types';

export interface TeamInfo {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface MatchWithOpponent {
  match: Match;
  opponent: TeamInfo;
}
