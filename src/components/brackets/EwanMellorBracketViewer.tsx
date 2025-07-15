import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { BracketsManagerData, BracketViewerConfig } from '@/utils/brackets/types/ewanMellorTypes';

interface EwanMellorBracketViewerProps {
  data: BracketsManagerData;
  onMatchClick?: (matchId: number) => void;
  config?: BracketViewerConfig;
  className?: string;
}

const EwanMellorBracketViewer: React.FC<EwanMellorBracketViewerProps> = ({
  data,
  onMatchClick,
  config = {},
  className
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const { resolvedTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeBracketViewer = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Dynamically import the brackets-viewer library
        const bracketsViewerModule = await import('@ewanmellor/brackets-viewer');
        const BracketsViewer = bracketsViewerModule.default || bracketsViewerModule.BracketsViewer || bracketsViewerModule;
        
        if (!containerRef.current) return;

        // Clear any existing viewer
        if (viewerRef.current) {
          viewerRef.current.destroy?.();
        }

        // Configure viewer options
        const viewerConfig = {
          participantOriginPlacement: config.participantOriginPlacement || 'before',
          separatorType: config.separatorType || 'bracket',
          showSlotsOrigin: config.showSlotsOrigin !== false,
          showLowerBracketSlotsOrigin: config.showLowerBracketSlotsOrigin !== false,
          highlightParticipantOnHover: config.highlightParticipantOnHover !== false,
          showPopoverOnMatchLabelClick: config.showPopoverOnMatchLabelClick !== false,
          showPopoverOnMatchClick: config.showPopoverOnMatchClick !== false,
          customRoundName: config.customRoundName,
          ...config
        };

        // Create new viewer instance
        viewerRef.current = new (BracketsViewer as any)();
        
        // Initialize viewer with data
        await viewerRef.current.render(
          viewerConfig,
          data,
          {
            onMatchClick: onMatchClick ? (match: any) => {
              onMatchClick(match.id);
            } : undefined,
            customCSS: getBracketThemeCSS(resolvedTheme === 'dark')
          }
        );

        // Mount to DOM
        if (containerRef.current) {
          containerRef.current.appendChild(viewerRef.current.container);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing bracket viewer:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize bracket viewer');
        setIsLoading(false);
      }
    };

    initializeBracketViewer();

    // Cleanup on unmount
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy?.();
      }
    };
  }, [data, onMatchClick, config, resolvedTheme]);

  // Handle responsive resizing
  useEffect(() => {
    const handleResize = () => {
      if (viewerRef.current && viewerRef.current.resize) {
        viewerRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (error) {
    return (
      <div className={cn(
        'bracket-viewer-error',
        'w-full min-h-96 rounded-lg border border-destructive/20 bg-destructive/5',
        'p-8 flex items-center justify-center',
        className
      )}>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-destructive mb-2">Bracket Error</h3>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn(
        'bracket-viewer-loading',
        'w-full min-h-96 rounded-lg border bg-card',
        'p-8 flex items-center justify-center',
        className
      )}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading bracket...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'bracket-viewer-container',
      'w-full min-h-96 overflow-auto',
      'rounded-lg border bg-card p-4',
      className
    )}>
      <div ref={containerRef} className="bracket-viewer-content" />
    </div>
  );
};

// Generate CSS for bracket theming
function getBracketThemeCSS(isDark: boolean): string {
  const colors = {
    background: isDark ? '#0f172a' : '#ffffff',
    text: isDark ? '#f1f5f9' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#374151' : '#e2e8f0',
    matchBackground: isDark ? '#1e293b' : '#f8fafc',
    matchHover: isDark ? '#334155' : '#f1f5f9',
    winnerBackground: isDark ? '#166534' : '#dcfce7',
    loserBackground: isDark ? '#7f1d1d' : '#fecaca',
    connector: isDark ? '#6b7280' : '#9ca3af'
  };

  return `
    .brackets-viewer {
      background-color: ${colors.background};
      color: ${colors.text};
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
    }
    
    .bracket-match {
      background-color: ${colors.matchBackground};
      border: 1px solid ${colors.border};
      border-radius: 0.375rem;
      transition: all 0.2s ease;
    }
    
    .bracket-match:hover {
      background-color: ${colors.matchHover};
      border-color: ${colors.text};
    }
    
    .bracket-participant {
      color: ${colors.text};
      padding: 0.375rem 0.75rem;
      border-radius: 0.25rem;
    }
    
    .bracket-participant.winner {
      background-color: ${colors.winnerBackground};
      color: ${isDark ? '#ffffff' : '#166534'};
    }
    
    .bracket-participant.loser {
      background-color: ${colors.loserBackground};
      color: ${isDark ? '#ffffff' : '#7f1d1d'};
    }
    
    .bracket-connector {
      stroke: ${colors.connector};
      stroke-width: 2;
    }
    
    .bracket-round-title {
      color: ${colors.text};
      font-weight: 600;
      font-size: 1.125rem;
    }
    
    .bracket-match-title {
      color: ${colors.textMuted};
      font-size: 0.875rem;
    }
  `;
}

export default EwanMellorBracketViewer;