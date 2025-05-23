
declare module 'brackets-viewer' {
  export interface BracketsViewerOptions {
    container: HTMLElement;
    data: {
      participants: Array<{
        id: number;
        name: string;
        tournament_id?: number;
        seed?: number | null;
      }>;
      matches: Array<{
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
      }>;
    };
    onMatchClick?: (match: any) => void;
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

  export class BracketsViewer {
    constructor(options: BracketsViewerOptions);
    destroy(): void;
  }
}
