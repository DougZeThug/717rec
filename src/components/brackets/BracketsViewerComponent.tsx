import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

// Type definitions for bracket data
export interface BracketMatch {
  id: number;
  number: number;
  stage_id: number;
  group_id: number;
  round_id: number;
  child_count: number;
  status: number;
  opponent1: {
    id: number | null;
    position?: number;
    result?: 'win' | 'loss';
    score?: number;
  } | null;
  opponent2: {
    id: number | null;
    position?: number;
    result?: 'win' | 'loss';
    score?: number;
  } | null;
}

export interface BracketParticipant {
  id: number;
  tournament_id: number;
  name: string;
}

export interface BracketData {
  stage: Array<{
    id: number;
    tournament_id: number;
    name: string;
    type: string;
    number: number;
    settings: {
      size?: number;
      seedOrdering?: string[];
      balanceByes?: boolean;
      grandFinal?: string;
      skipFirstRound?: boolean;
      consolationFinal?: boolean;
      matchesChildCount?: number;
    };
  }>;
  group: Array<{
    id: number;
    stage_id: number;
    number: number;
    name: string;
  }>;
  round: Array<{
    id: number;
    number: number;
    stage_id: number;
    group_id: number;
    name: string;
  }>;
  match: BracketMatch[];
  match_game: Array<{
    id: number;
    number: number;
    stage_id: number;
    parent_id: number;
    status: number;
    opponent1: {
      id: number | null;
      position?: number;
      result?: 'win' | 'loss';
      score?: number;
    } | null;
    opponent2: {
      id: number | null;
      position?: number;
      result?: 'win' | 'loss';
      score?: number;
    } | null;
  }>;
  participant: BracketParticipant[];
}

export interface BracketsViewerProps {
  data: BracketData;
  onMatchClick?: (match: BracketMatch) => void;
  onParticipantClick?: (participant: BracketParticipant) => void;
  className?: string;
  config?: {
    participantOriginPlacement?: 'before' | 'after';
    separatorType?: 'bracket' | 'square';
    showSlotsOrigin?: boolean;
    showLowerBracketSlotsOrigin?: boolean;
    highlightParticipantOnHover?: boolean;
    showPopoverOnMatchLabelClick?: boolean;
    showPopoverOnMatchClick?: boolean;
    customRoundName?: (info: { roundNumber: number; roundCount: number }) => string;
  };
}

// Simple bracket viewer implementation
class SimpleBracketsViewer {
  private container: HTMLElement | null = null;
  private data: any = null;
  private config: any = {};
  
  public onMatchClick?: (match: BracketMatch) => void;
  public onParticipantClick?: (participant: BracketParticipant) => void;

  render(data: any, config: any) {
    this.data = data;
    this.config = config;
    this.container = config.selector;
    
    if (!this.container) return;
    
    // Clear container
    this.container.innerHTML = '';
    
    // Create a simple bracket visualization
    const bracketContainer = document.createElement('div');
    bracketContainer.className = 'simple-bracket-container';
    bracketContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 20px;
      min-height: 400px;
      justify-content: center;
      align-items: center;
    `;
    
    // Create placeholder content
    const title = document.createElement('h3');
    title.textContent = 'Bracket Viewer';
    title.style.cssText = `
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--brackets-text-color, #333);
      margin-bottom: 20px;
    `;
    
    const info = document.createElement('div');
    info.style.cssText = `
      text-align: center;
      color: var(--brackets-text-color, #666);
      line-height: 1.6;
    `;
    
    const participantCount = data.participants?.length || 0;
    const matchCount = data.matches?.length || 0;
    
    info.innerHTML = `
      <p>Tournament bracket ready for visualization</p>
      <p>Participants: ${participantCount}</p>
      <p>Matches: ${matchCount}</p>
      <p style="margin-top: 20px; font-size: 0.9rem; opacity: 0.8;">
        This is a placeholder for the brackets-viewer.js library.<br/>
        The component structure is ready for integration.
      </p>
    `;
    
    bracketContainer.appendChild(title);
    bracketContainer.appendChild(info);
    
    this.container.appendChild(bracketContainer);
  }
  
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

const BracketsViewerComponent: React.FC<BracketsViewerProps> = ({
  data,
  onMatchClick,
  onParticipantClick,
  className,
  config = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<SimpleBracketsViewer | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { resolvedTheme } = useTheme();

  // Initialize brackets viewer
  useEffect(() => {
    if (!containerRef.current || !data || isInitialized) return;

    try {
      // Create viewer instance
      viewerRef.current = new SimpleBracketsViewer();

      // Configure viewer
      const viewerConfig = {
        participantOriginPlacement: config.participantOriginPlacement || 'before',
        separatorType: config.separatorType || 'bracket',
        showSlotsOrigin: config.showSlotsOrigin ?? true,
        showLowerBracketSlotsOrigin: config.showLowerBracketSlotsOrigin ?? true,
        highlightParticipantOnHover: config.highlightParticipantOnHover ?? true,
        showPopoverOnMatchLabelClick: config.showPopoverOnMatchLabelClick ?? false,
        showPopoverOnMatchClick: config.showPopoverOnMatchClick ?? false,
        customRoundName: config.customRoundName,
        ...config,
        selector: containerRef.current,
      };

      // Render bracket
      viewerRef.current.render(
        {
          stages: data.stage,
          matches: data.match,
          matchGames: data.match_game,
          participants: data.participant,
        },
        viewerConfig
      );

      // Set up event listeners
      if (onMatchClick) {
        viewerRef.current.onMatchClick = onMatchClick;
      }

      if (onParticipantClick) {
        viewerRef.current.onParticipantClick = onParticipantClick;
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing brackets viewer:', error);
    }
  }, [data, onMatchClick, onParticipantClick, config, isInitialized]);

  // Update data when it changes
  useEffect(() => {
    if (!viewerRef.current || !isInitialized) return;

    try {
      viewerRef.current.render(
        {
          stages: data.stage,
          matches: data.match,
          matchGames: data.match_game,
          participants: data.participant,
        },
        {
          selector: containerRef.current,
          participantOriginPlacement: config.participantOriginPlacement || 'before',
          separatorType: config.separatorType || 'bracket',
          showSlotsOrigin: config.showSlotsOrigin ?? true,
          showLowerBracketSlotsOrigin: config.showLowerBracketSlotsOrigin ?? true,
          highlightParticipantOnHover: config.highlightParticipantOnHover ?? true,
          showPopoverOnMatchLabelClick: config.showPopoverOnMatchLabelClick ?? false,
          showPopoverOnMatchClick: config.showPopoverOnMatchClick ?? false,
          customRoundName: config.customRoundName,
          ...config,
        }
      );
    } catch (error) {
      console.error('Error updating brackets viewer:', error);
    }
  }, [data, config, isInitialized]);

  // Apply theme-based styling
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Apply theme-based CSS custom properties
    container.style.setProperty('--brackets-background-color', 'hsl(var(--background))');
    container.style.setProperty('--brackets-text-color', 'hsl(var(--foreground))');
    container.style.setProperty('--brackets-border-color', 'hsl(var(--border))');
    container.style.setProperty('--brackets-match-background', 'hsl(var(--card))');
    container.style.setProperty('--brackets-match-border', 'hsl(var(--border))');
    container.style.setProperty('--brackets-participant-background', 'hsl(var(--muted))');
    container.style.setProperty('--brackets-participant-text', 'hsl(var(--muted-foreground))');
    container.style.setProperty('--brackets-winner-text', 'hsl(var(--primary))');
    container.style.setProperty('--brackets-loser-text', 'hsl(var(--muted-foreground))');
  }, [resolvedTheme]);

  // Handle responsive behavior
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (viewerRef.current && isInitialized) {
        try {
          // Trigger a re-render to handle responsive behavior
          viewerRef.current.render(
            {
              stages: data.stage,
              matches: data.match,
              matchGames: data.match_game,
              participants: data.participant,
            },
            {
              selector: containerRef.current,
              participantOriginPlacement: config.participantOriginPlacement || 'before',
              separatorType: config.separatorType || 'bracket',
              showSlotsOrigin: config.showSlotsOrigin ?? true,
              showLowerBracketSlotsOrigin: config.showLowerBracketSlotsOrigin ?? true,
              highlightParticipantOnHover: config.highlightParticipantOnHover ?? true,
              showPopoverOnMatchLabelClick: config.showPopoverOnMatchLabelClick ?? false,
              showPopoverOnMatchClick: config.showPopoverOnMatchClick ?? false,
              customRoundName: config.customRoundName,
              ...config,
            }
          );
        } catch (error) {
          console.error('Error resizing brackets viewer:', error);
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [data, config, isInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy?.();
        } catch (error) {
          console.error('Error destroying brackets viewer:', error);
        }
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'brackets-viewer-container',
        'w-full min-h-96 overflow-auto',
        'rounded-lg border bg-card',
        'p-4',
        className
      )}
      style={{
        '--brackets-background-color': 'hsl(var(--background))',
        '--brackets-text-color': 'hsl(var(--foreground))',
        '--brackets-border-color': 'hsl(var(--border))',
        '--brackets-match-background': 'hsl(var(--card))',
        '--brackets-match-border': 'hsl(var(--border))',
        '--brackets-participant-background': 'hsl(var(--muted))',
        '--brackets-participant-text': 'hsl(var(--muted-foreground))',
        '--brackets-winner-text': 'hsl(var(--primary))',
        '--brackets-loser-text': 'hsl(var(--muted-foreground))',
      } as React.CSSProperties}
    />
  );
};

export default BracketsViewerComponent;