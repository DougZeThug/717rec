import { Team } from "./index";

// Re-export Team for convenience
export type { Team };

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

export interface CompatibilityWeights {
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

/**
 * New interface for back-to-back team grouping
 */
export interface BackToBackTeamsMap {
  [pairName: string]: {
    primary: Team[];
    secondary: Team[];
    pairLabel: string;
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

export interface PairingResult {
  pairings: TeamPairingMap;
  unmatchedTeamIds: string[];
}

export interface PreviewResult {
  date: Date;
  timeBlocks: TimeBlockTeamsMap;
  unmatchableBlocks: string[];
}

/**
 * Enhanced pairing result to include back-to-back information
 */
export interface BackToBackPairingResult extends PairingResult {
  backToBackPairs?: BackToBackTeamsMap;
  opponentDiversityScore?: number;
}

// Add missing MatchConversionOptions interface
export interface MatchConversionOptions {
  includeMetadata?: boolean;
  validateTeams?: boolean;
  defaultLocation?: string;
  dualMatchMode?: boolean;
}
