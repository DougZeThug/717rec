// Career stats related types

export interface CareerRanking {
  teamId: string;
  teamName: string;
  logoUrl?: string | null;
  imageUrl?: string | null;
  divisionName?: string | null; // Add division info to identify hidden teams

  // Career match stats
  careerMatchWins: number;
  careerMatchLosses: number;
  careerWinPercentage: number;

  // Career game stats
  careerGameWins: number;
  careerGameLosses: number;
  careerGameWinPercentage: number;

  // Career playoff stats
  careerPlayoffWins: number;
  careerPlayoffLosses: number;
  careerPlayoffWinPercentage: number;

  // Achievements
  championships: number;
  runnerUps: number;

  // Career power score and meta stats
  careerPowerScore: number;
  careerSos: number;
  playoffFinishes: number;
}
