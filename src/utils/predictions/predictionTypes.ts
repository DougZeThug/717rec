export interface TeamStats {
  power_score: number | null;
  sos: number | null;
  division_id: string | null;
  career_power_score?: number | null;
  career_sos?: number | null;
  career_win_percentage?: number | null;
}

export interface HeadToHeadStats {
  team1Wins: number;
  team2Wins: number;
  totalMatches: number;
}

export interface PredictionBreakdown {
  powerScoreA: number;
  powerScoreB: number;
  sosA: number;
  sosB: number;
  divisionWeightA: number;
  divisionWeightB: number;
  careerPowerA: number;
  careerPowerB: number;
  careerSosA: number;
  careerSosB: number;
  careerWinPctA: number;
  careerWinPctB: number;
  h2hWinsA: number;
  h2hWinsB: number;
  h2hTotalMatches: number;
  h2hRatingA: number;
  h2hRatingB: number;
  h2hDominanceFactor: number;
  hasH2HData: boolean;
  seasonRatingA: number;
  seasonRatingB: number;
  careerRatingA: number;
  careerRatingB: number;
  teamRatingA: number;
  teamRatingB: number;
  ratingDiff: number;
  hasCareerDataA: boolean;
  hasCareerDataB: boolean;
}

export type ConfidenceLevel = 'Low' | 'Medium' | 'High';

export interface PredictionResult {
  probA: number;
  probB: number;
  expectedText: string;
  confidence: ConfidenceLevel;
  breakdown: PredictionBreakdown;
}
