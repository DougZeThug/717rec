export interface BracketPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BracketMatch {
  id: string;
  team1Name?: string;
  team2Name?: string;
  team1Logo?: string;
  team2Logo?: string;
  team1Score: number | null;
  team2Score: number | null;
  team1Seed?: number;
  team2Seed?: number;
  winnerId: string | null;
  team1Id: string | null;
  team2Id: string | null;
  status: string;
  matchType: 'winners' | 'losers' | 'finals';
  round: number;
  position: number;
}

export interface BracketRound {
  id: string;
  title: string;
  matches: BracketMatch[];
  position: BracketPosition;
  matchType: 'winners' | 'losers' | 'finals';
}

export interface BracketSection {
  type: 'winners' | 'losers' | 'finals';
  title: string;
  rounds: BracketRound[];
  position: BracketPosition;
}

export interface ProcessedBracketData {
  sections: BracketSection[];
  connections: BracketConnection[];
  dimensions: {
    width: number;
    height: number;
  };
}

export interface BracketConnection {
  id: string;
  fromMatch: string;
  toMatch: string;
  path: string;
  type: 'winners' | 'losers' | 'finals';
  positioning?: {
    path: string;
    segments: Array<{
      type: 'horizontal' | 'vertical';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      isFirstSegment?: boolean;
      isLastSegment?: boolean;
      isConnector?: boolean;
    }>;
    fromPoint: { x: number; y: number };
    toPoint: { x: number; y: number };
    midPoint: { x: number; y: number };
    roundIndex: number;
    matchIndex: number;
    sectionType: string;
  };
}

export interface BracketTheme {
  name: string;
  colors: {
    background: string;
    winners: string;
    losers: string;
    finals: string;
    completed: string;
    pending: string;
    text: string;
    border: string;
  };
  spacing: {
    matchWidth: number;
    matchHeight: number;
    columnGap: number;
    rowGap: number;
  };
}

export interface BracketStyleProps {
  theme?: BracketTheme;
  size?: 'compact' | 'normal' | 'large';
  showConnectors?: boolean;
  responsive?: boolean;
}
