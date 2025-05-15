
import { 
  TimeBlockTeamsMap, 
  TeamPairingMap,
  AutoScheduleMatch,
  AlgorithmConfig
} from '@/types/autoSchedule';

export interface UseAutoScheduleState {
  selectedDate: Date | null;
  activeTab: string;
  avoidRematches: boolean;
  prioritizeQuality: boolean;
  isProcessing: boolean;
  generatedMatches: AutoScheduleMatch[];
  matchQualityMetrics: {
    totalMatches: number;
    rematchCount: number;
    averageCompatibilityScore: number;
    qualityRating: string;
  } | null;
}
