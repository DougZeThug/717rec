// Type declarations for @ewanmellor/brackets-viewer
declare module '@ewanmellor/brackets-viewer' {
  export interface BracketsViewerOptions {
    participantOriginPlacement?: 'before' | 'after';
    separatorType?: 'bracket' | 'square';
    showSlotsOrigin?: boolean;
    showLowerBracketSlotsOrigin?: boolean;
    highlightParticipantOnHover?: boolean;
    showPopoverOnMatchLabelClick?: boolean;
    showPopoverOnMatchClick?: boolean;
    customRoundName?: (info: { roundNumber: number; roundCount: number }) => string;
  }

  export interface BracketsViewerData {
    stage: any[];
    group: any[];
    round: any[];
    match: any[];
    match_game: any[];
    participant: any[];
  }

  export interface BracketsViewerCallbacks {
    onMatchClick?: (match: any) => void;
    customCSS?: string;
  }

  export class BracketsViewer {
    container: HTMLElement;
    
    constructor();
    
    render(
      options: BracketsViewerOptions,
      data: BracketsViewerData,
      callbacks?: BracketsViewerCallbacks
    ): Promise<void>;
    
    destroy(): void;
    resize(): void;
  }

  export default BracketsViewer;
}