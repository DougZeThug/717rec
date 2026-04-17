import { Team } from '@/types';

export type TeamPairingConfig = {
  avoidRematches?: boolean;
  haveTeamsPlayedFn: (team1Id: string, team2Id: string) => Promise<boolean>;
  getCompatibilityScoreFn: (team1: Team, team2: Team) => number;
  maxScore?: number;
  weights?: {
    powerScoreWeight?: number;
    sosWeight?: number;
    recordWeight?: number;
    gameRecordWeight?: number;
    tierPenalty?: number;
  };
  playedPairsSet?: Set<string>; // Pre-fetched match history for performance
};

export type Edge = {
  team1: Team;
  team2: Team;
  weight: number;
  rawScore: number; // Original 0-10 compatibility score (before penalties)
  hasPlayedBefore: boolean;
  pairingKey: string;
};

/**
 * Constraint relaxation levels for progressive fallback
 */
export type RelaxationLevel = 0 | 1 | 2 | 3;

/**
 * Analysis of a team's available edges in the graph
 */
export type TeamEdgeAnalysis = {
  teamId: string;
  teamName: string;
  tier: number;
  totalEdges: number;
  edgesBlockedByTier: number;
  edgesBlockedByRematch: number;
  availableEdges: number;
  isAtRisk: boolean; // Has fewer than 2 available edges
  uniqueOpponentIds: string[];
};

/**
 * Result of graph feasibility analysis
 */
export type GraphFeasibilityResult = {
  isFeasible: boolean;
  atRiskTeams: TeamEdgeAnalysis[];
  recommendedRelaxation: RelaxationLevel;
  analysis: Map<string, TeamEdgeAnalysis>;
};
