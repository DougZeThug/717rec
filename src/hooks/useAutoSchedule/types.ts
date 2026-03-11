import { MatchQualityMetrics } from '@/types/autoSchedule';

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
  generatedMatches: any[] | null;
  setGeneratedMatches: (matches: any[]) => void;
  matchQualityMetrics: MatchQualityMetrics | null;
  setMatchQualityMetrics: (metrics: MatchQualityMetrics | null) => void;
}

export interface PairingOperationsProps {
  setActiveTab: (tab: string) => void;
  dualMatchMode?: boolean;
  // Maps team ID to array of block names (supports double headers in multiple blocks)
  teamBlockMap?: Record<string, string[]>;
}
