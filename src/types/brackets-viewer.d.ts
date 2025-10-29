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

interface BracketsViewerConfig {
  selector?: string;
  clear?: boolean;
  participantOriginPlacement?: 'before' | 'after' | 'none';
  separatedChildCountLabel?: boolean;
  showSlotsOrigin?: boolean;
  showLowerBracketSlotsOrigin?: boolean;
  highlightParticipantOnHover?: boolean;
  onMatchClick?: (match: any) => void;
  customRoundName?: (info: any) => string;
}

export {};
