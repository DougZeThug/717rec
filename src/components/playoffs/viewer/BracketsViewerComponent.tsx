import React, { useEffect, useRef, useState } from 'react';
import { PlayoffBracket, PlayoffTeam } from '@/utils/playoffs/playoffTypes';
import { BracketsViewerAdapter } from '@/services/brackets/viewer';

interface BracketsViewerComponentProps {
  bracket: PlayoffBracket;
  teams: PlayoffTeam[];
  onMatchClick?: (matchId: string) => void;
}

export const BracketsViewerComponent: React.FC<BracketsViewerComponentProps> = ({
  bracket,
  teams,
  onMatchClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const getPlayoffMatchIdRef = useRef<((id: number) => string | undefined) | null>(null);

  useEffect(() => {
    if (!containerRef.current || !bracket || !teams.length) {
      return;
    }

    // Check if brackets-viewer is loaded
    if (!window.bracketsViewer) {
      setError('brackets-viewer library not loaded');
      console.error('brackets-viewer is not available on window object');
      return;
    }

    try {
      // Transform data with stored participants if available
      const result = BracketsViewerAdapter.transform(
        bracket, 
        teams,
        bracket.participants
      );

      // Store the mapping function in ref
      getPlayoffMatchIdRef.current = result.getPlayoffMatchId;

      console.log('Rendering brackets-viewer with data:', result.data);

      // Render using brackets-viewer v1.8.1
      window.bracketsViewer.render(
        result.data,
        {
          selector: '#brackets-viewer-container',
          clear: true,
          participantOriginPlacement: 'before',
          separatedChildCountLabel: true,
          showSlotsOrigin: true,
          showLowerBracketSlotsOrigin: true,
          highlightParticipantOnHover: true,
          onMatchClick: (match: any) => {
            console.log('Match clicked:', match);
            if (onMatchClick && getPlayoffMatchIdRef.current) {
              const playoffMatchId = getPlayoffMatchIdRef.current(match.id);
              if (playoffMatchId) {
                onMatchClick(playoffMatchId);
              } else {
                console.error('❌ Could not map viewer match ID to playoff match:', match.id);
              }
            }
          }
        }
      );

      setIsInitialized(true);
      setError(null);
    } catch (err) {
      console.error('Error rendering brackets-viewer:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }

    // Cleanup on unmount
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      setIsInitialized(false);
    };
  }, [bracket, teams, onMatchClick]);

  if (!bracket || !teams.length) {
    return (
      <div className="text-center p-8">
        <p className="text-lg text-muted-foreground">No bracket data available</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-lg text-destructive">Error loading bracket: {error}</p>
        <p className="text-sm text-muted-foreground mt-2">
          Please ensure brackets-viewer is properly installed and loaded.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto bg-background">
      <div 
        ref={containerRef}
        id="brackets-viewer-container"
        className="brackets-viewer min-w-max p-4"
        style={{ minHeight: '400px' }}
      />
      {!isInitialized && (
        <div className="text-center p-8">
          <p className="text-sm text-muted-foreground">Loading bracket...</p>
        </div>
      )}
    </div>
  );
};
