
export interface Ranking {
  teamId: string;
  teamName: string;
  logoUrl?: string | null;
  imageUrl?: string | null;
  wins: number;
  losses: number;
  winPercentage: number;
  divisionName?: string | null;
  sos?: number;
  streak?: string;
  headToHead?: HeadToHeadMap;
  previousRank?: number;
  rankChange?: number; // Ensure this is present
}
