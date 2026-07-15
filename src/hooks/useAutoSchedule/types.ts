import { AutoScheduleMatch, MatchQualityMetrics } from '@/types/autoSchedule';

export interface UseAutoScheduleState {
  // Date and tab state
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Algorithm settings
  avoidRematches: boolean;
  setAvoidRematches: (value: boolean) => void;
  prioritizeQuality: boolean;
  setPrioritizeQuality: (value: boolean) => void;
  dualMatchMode: boolean;
  setDualMatchMode: (value: boolean) => void;

  // Processing state
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;

  // Generated data
  generatedMatches: AutoScheduleMatch[] | null;
  setGeneratedMatches: (matches: AutoScheduleMatch[]) => void;
  matchQualityMetrics: MatchQualityMetrics | null;
  setMatchQualityMetrics: (metrics: MatchQualityMetrics | null) => void;
}
