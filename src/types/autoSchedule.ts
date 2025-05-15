
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
  unmatchedTeamIds?: string[];
}

export interface TimeBlockTeamsMap {
  [timeBlock: string]: Team[];
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
}

export interface AlgorithmConfig {
  avoidRematches?: boolean;
  prioritizeQuality?: boolean;
  weights?: {
    powerScoreWeight?: number;
    sosWeight?: number;
    recordWeight?: number;
    gameRecordWeight?: number;
  };
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
