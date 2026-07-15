import type { Team } from './index';

export interface TeamPair {
  team1: Team;
  team2: Team;
  compatibilityScore: number;
  hasPlayedBefore: boolean;
}

// Add TeamPairing as an alias for backwards compatibility
export type TeamPairing = TeamPair;

export interface AutoScheduleMatch {
  id: string;
  team1Id: string;
  team2Id: string;
  timeslot: string;
  date: Date;
  blockType?: 'primary' | 'secondary';
}

interface CompatibilityWeights {
  powerScoreWeight?: number;
  sosWeight?: number;
  recordWeight?: number;
  gameRecordWeight?: number;
  divisionWeight?: number;
}

/**
 * Enhanced configuration for dual block scheduling
 * Now supports back-to-back pairs
 */
export interface DualBlockConfig {
  avoidRematches?: boolean;
  prioritizeQuality?: boolean;
  dualMatchMode?: boolean;
  primaryBlock?: string;
  secondaryBlock?: string;
  unmatchedTeamStrategy?: 'lowest-rank' | 'highest-rank' | 'random';
  weights?: CompatibilityWeights;
  // New back-to-back specific options
  backToBackMode?: boolean;
  backToBackPair?: 'Early' | 'Mid' | 'Late';
  requireOpponentDiversity?: boolean; // Ensure different opponents in back-to-back matches
}

export interface TeamPairingMap {
  [timeBlock: string]: TeamPair[];
}

export interface TimeBlockTeamsMap {
  [timeBlock: string]: Team[];
}

export interface PairedTimeBlockTeamsMap {
  [blockPairKey: string]: {
    primaryBlock: string;
    secondaryBlock: string;
    primaryTeams: Team[];
    secondaryTeams: Team[];
  };
}

export interface AlgorithmConfig {
  avoidRematches?: boolean;
  prioritizeQuality?: boolean;
  dualMatchMode?: boolean;
  weights?: CompatibilityWeights;
}

export interface MatchQualityMetrics {
  totalMatches: number;
  rematchCount: number;
  averageCompatibilityScore: number;
  qualityRating: 'Excellent' | 'Good' | 'Fair' | 'Poor';

  // Enhanced metrics for detailed analysis
  opponentDiversity: {
    duplicateOpponents: number;
    uniqueOpponents: number;
    diversityScore: number; // 0-100, higher is better
  };

  powerScoreAnalysis: {
    averagePowerScoreDifference: number;
    balancedMatches: number; // matches within acceptable power score range
    unbalancedMatches: number;
  };

  blockAnalysis?: {
    primaryBlockQuality: number;
    secondaryBlockQuality: number;
    crossBlockDiversity: number;
  };

  performanceMetrics: {
    generationTimeMs: number;
    algorithmsUsed: string[];
    optimizationLevel: 'basic' | 'standard' | 'advanced';
  };

  feedback: {
    strengths: string[];
    improvements: string[];
    recommendations: string[];
  };
}

/**
 * Diagnostics information about constraint relaxation applied during scheduling
 */
export interface SchedulingDiagnostics {
  /** Level of constraint relaxation applied (0=none, 1=rematches, 2=tiers, 3=full) */
  relaxationApplied: 0 | 1 | 2 | 3;
  /** List of constraints that were relaxed */
  constraintsRelaxed: string[];
  /** Whether a repair pass was needed to match remaining teams */
  repairAttempted: boolean;
}

export interface PairingResult {
  pairings: TeamPairingMap;
  unmatchedTeamIds: string[];
  /** Optional diagnostics about constraint relaxation */
  diagnostics?: SchedulingDiagnostics;
}

export interface PreviewResult {
  date: Date;
  timeBlocks: TimeBlockTeamsMap;
  unmatchableBlocks: string[];
}
