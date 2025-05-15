
import { Team } from "./index";

export interface TeamPairing {
  team1: Team;
  team2: Team;
  compatibilityScore: number;
  hasPlayedBefore?: boolean;
}

export interface TimeBlockData {
  main: string;
  secondary: string;
}

export interface TeamPairingMap {
  [timeBlock: string]: TeamPairing[];
}

// Separate interface to hold pairings result with unmatchedTeamIds
export interface PairingResult {
  pairings: TeamPairingMap;
  unmatchedTeamIds: string[];
}

export interface TimeBlockTeamsMap {
  [timeBlock: string]: Team[];
}

// New interface for paired blocks structure
export interface PairedTimeBlockTeamsMap {
  [blockPairKey: string]: {
    primaryBlock: string;
    secondaryBlock: string;
    primaryTeams: Team[];
    secondaryTeams: Team[];
  };
}

export interface PreviewResult {
  date: Date;
  timeBlocks: TimeBlockTeamsMap;
  unmatchableBlocks: string[];
}

export interface AutoScheduleStepProps {
  selectedDate: Date | null;
  isGenerating: boolean;
  onNext: () => void;
  onPrevious?: () => void;
}

export interface AutoScheduleMatch {
  id: string;
  team1Id: string;
  team2Id: string;
  timeslot: string;
  date?: Date;
  blockType?: 'primary' | 'secondary'; // Added for dual block match identification
}

export interface AlgorithmConfig {
  avoidRematches?: boolean;
  prioritizeQuality?: boolean;
  dualMatchMode?: boolean;
  weights?: {
    powerScoreWeight?: number;
    sosWeight?: number;
    recordWeight?: number;
    gameRecordWeight?: number;
  };
}

// Add DualBlockConfig interface
export interface DualBlockConfig extends AlgorithmConfig {
  primaryBlock?: string;
  secondaryBlock?: string;
  unmatchedTeamStrategy?: 'random' | 'lowest-rank' | 'manual';
}

export interface MatchQualityMetrics {
  totalMatches: number;
  rematchCount: number;
  averageCompatibilityScore: number;
  qualityRating: string;
}

export interface TabProps {
  selectedDate: Date | null;
  timeBlockTeams?: TimeBlockTeamsMap;
  generatedPairings?: TeamPairingMap;
  isGenerating: boolean;
  unmatchedTeamIds?: string[];
  matchQualityMetrics?: MatchQualityMetrics | null;
}

// New interface for paired time blocks in dual match mode
export interface TimeBlockPair {
  primaryBlock: string;
  secondaryBlock: string;
  primaryTime: string;
  secondaryTime: string;
  teams?: Team[];
}

// Interface for dual-match specific metrics
export interface DualMatchMetrics {
  teamsWithBothMatches: number;
  teamsWithSingleMatch: number;
  crossBlockCompatibility: number;
}

// New interface for dual match conversion options
export interface MatchConversionOptions {
  dualMatchMode?: boolean;
  preserveBlockInfo?: boolean;
  customBlockMapping?: Record<string, string>;
}
