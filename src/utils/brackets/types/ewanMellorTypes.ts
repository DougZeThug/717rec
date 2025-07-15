// Type definitions for @ewanmellor/brackets-viewer
// Based on brackets-manager data structure

export interface BracketsManagerData {
  stage: Stage[];
  group: Group[];
  round: Round[];
  match: Match[];
  match_game: MatchGame[];
  participant: Participant[];
}

export interface Stage {
  id: number;
  tournament_id: number;
  name: string;
  type: 'single_elimination' | 'double_elimination';
  number: number;
  settings: {
    size?: number;
    seedOrdering?: string[];
    balanceByes?: boolean;
    grandFinal?: 'simple' | 'double';
    skipFirstRound?: boolean;
    consolationFinal?: boolean;
    matchesChildCount?: number;
  };
}

export interface Group {
  id: number;
  stage_id: number;
  number: number;
  name: string;
}

export interface Round {
  id: number;
  number: number;
  stage_id: number;
  group_id: number;
  name: string;
}

export interface Match {
  id: number;
  number: number;
  stage_id: number;
  group_id: number;
  round_id: number;
  child_count: number;
  status: MatchStatus;
  opponent1: Opponent | null;
  opponent2: Opponent | null;
}

export interface MatchGame {
  id: number;
  number: number;
  stage_id: number;
  parent_id: number;
  status: MatchStatus;
  opponent1: Opponent | null;
  opponent2: Opponent | null;
}

export interface Opponent {
  id: number | null;
  position?: number;
  result?: 'win' | 'loss';
  score?: number;
  forfeit?: boolean;
}

export interface Participant {
  id: number;
  tournament_id: number;
  name: string;
}

export enum MatchStatus {
  Locked = 0,
  Waiting = 1,
  Ready = 2,
  Running = 3,
  Completed = 4,
  Archived = 5
}

// Bracket viewer configuration
export interface BracketViewerConfig {
  participantOriginPlacement?: 'before' | 'after';
  separatorType?: 'bracket' | 'square';
  showSlotsOrigin?: boolean;
  showLowerBracketSlotsOrigin?: boolean;
  highlightParticipantOnHover?: boolean;
  showPopoverOnMatchLabelClick?: boolean;
  showPopoverOnMatchClick?: boolean;
  customRoundName?: (info: { roundNumber: number; roundCount: number }) => string;
}