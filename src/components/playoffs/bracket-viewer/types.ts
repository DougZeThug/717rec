
/**
 * TypeScript interfaces for brackets-viewer.js integration
 */

export interface Participant {
  id: number;
  tournament_id?: number;
  name: string;
  seed?: number | null;
}

export interface Match {
  id: number;
  tournament_id?: number;
  round: number;
  position: number;
  participant1_id: number | null;
  participant2_id: number | null;
  participant1_prereq_match_id?: number | null;
  participant2_prereq_match_id?: number | null;
  participant1_is_prereq_match_loser?: boolean;
  participant2_is_prereq_match_loser?: boolean;
  winner_id?: number | null;
  loser_id?: number | null;
  status?: string;
  group_id?: number;
}

export interface BracketData {
  participants: Participant[];
  matches: Match[];
}

export interface BracketViewerOptions {
  container: HTMLElement;
  data: BracketData;
  onMatchClick?: (match: Match) => void;
  disableHighlight?: boolean;
  theme?: {
    fontFamily?: string;
    roundTextColor?: string;
    connectorColor?: string;
    connectorColorHighlight?: string;
    matchBackground?: string;
    matchBackgroundHighlight?: string;
    border?: string;
    textColor?: string;
    textColorHighlight?: string;
    headerTextColor?: string;
    scoreBackground?: string;
    liveMatchBorder?: string;
  };
}

/**
 * Conversion helpers to transform our app data to brackets-viewer format
 */

export interface PlayoffMatchTransformed {
  id: number;
  round: number;
  position: number;
  participant1_id: number | null;
  participant2_id: number | null;
  winner_id?: number | null;
  loser_id?: number | null;
  status?: string;
  group_id?: number;
  participant1_prereq_match_id?: number | null;
  participant2_prereq_match_id?: number | null;
  participant1_is_prereq_match_loser?: boolean;
  participant2_is_prereq_match_loser?: boolean;
}

export interface PlayoffTeamTransformed {
  id: number;
  name: string;
  seed?: number | null;
}
