
import { TeamPairingMap, TimeBlockTeamsMap, PreviewResult } from '@/types/autoSchedule';
import { Team } from '@/types';

export interface SchedulePreviewState {
  autoScheduleStep: 'teams' | 'pairings';
  isLoading: boolean;
  isGenerating: boolean;
  timeBlockTeams: TimeBlockTeamsMap;
  generatedPairings: TeamPairingMap;
  unmatchedTeamIds: string[];
}

export interface PreviewMatch {
  id: string;
  team1Id: string;
  team2Id: string;
  timeslot: string;
  blockType?: 'primary' | 'secondary'; // Add this property for dual match mode
}

export interface TeamCountsStatus {
  total: number;
  odd: number;
}

export interface AlgorithmOptions {
  avoidRematches?: boolean;
  prioritizeQuality?: boolean;
  weights?: {
    powerScoreWeight?: number;
    sosWeight?: number;
    recordWeight?: number;
    gameRecordWeight?: number;
  };
}
