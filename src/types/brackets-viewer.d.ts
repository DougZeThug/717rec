// Type declarations for brackets-viewer.js

import type {
  Group,
  Match,
  MatchGame,
  Participant,
  ParticipantResult,
  Round,
  Stage,
} from 'brackets-model';

declare global {
  interface Window {
    bracketsViewer: {
      render: (data: BracketsViewerData, config?: BracketsViewerConfig) => void;
      setParticipantImages: (images: { participantId: number; imageUrl: string }[]) => void;
    };
  }

  interface BracketsViewerData {
    stages: Stage[];
    groups?: Group[];
    rounds?: Round[];
    matches: Match[];
    matchGames: MatchGame[];
    participants: Participant[];
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
    opponent1?: ParticipantResult | null;
    opponent2?: ParticipantResult | null;
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
}

export {};
