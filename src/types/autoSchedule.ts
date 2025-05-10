
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
