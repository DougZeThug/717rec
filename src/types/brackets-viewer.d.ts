// Type declarations for brackets-viewer.js

declare global {
  interface Window {
    bracketsViewer: {
      render: (data: BracketsViewerData, config?: BracketsViewerConfig) => void;
      setParticipantImages: (images: { participantId: number; imageUrl: string }[]) => void;
    };
  }
}

interface BracketsViewerData {
  stages: any[];
  groups?: any[];
  rounds?: any[];
  matches: any[];
  matchGames: any[];
  participants: any[];
}

interface BracketsViewerCustomRoundInfo {
  groupType?: 'final-group' | 'winner-bracket' | 'loser-bracket' | string;
  roundNumber: number;
  roundCount: number;
}

interface BracketsViewerMatchClick {
  id: number;
  stage_id?: number | null;
  group_id?: number | null;
  round_id?: number | null;
  number?: number | null;
  opponent1?: any;
  opponent2?: any;
}

interface BracketsViewerConfig {
  selector?: string;
  clear?: boolean;
  participantOriginPlacement?: 'before' | 'after' | 'none';
  separatedChildCountLabel?: boolean;
  showSlotsOrigin?: boolean;
  showLowerBracketSlotsOrigin?: boolean;
  highlightParticipantOnHover?: boolean;
  onMatchClick?: (match: BracketsViewerMatchClick) => void;
  customRoundName?: (info: BracketsViewerCustomRoundInfo) => string;
}

export {};
