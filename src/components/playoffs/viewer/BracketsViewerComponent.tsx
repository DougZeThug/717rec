import React, { useEffect, useRef, useState } from 'react';
import { PlayoffBracket, PlayoffTeam } from '@/utils/playoffs/playoffTypes';
import { BracketsViewerAdapter } from '@/services/brackets/viewer';
import { InMemoryDatabase } from 'brackets-memory-db';

interface BracketsViewerComponentProps {
  bracket: PlayoffBracket & { bracket_data?: InMemoryDatabase['data'] };
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
    console.log('🔍 BracketsViewerComponent: useEffect triggered', {
      hasContainer: !!containerRef.current,
      hasBracket: !!bracket,
      teamsCount: teams.length,
      bracketId: bracket?.id
    });

    if (!containerRef.current || !bracket || !teams.length) {
      console.log('⚠️ BracketsViewerComponent: Missing required data, skipping render');
      return;
    }

    // Check if brackets-viewer is loaded
    console.log('🔍 Checking window.bracketsViewer:', {
      exists: !!window.bracketsViewer,
      hasRender: !!(window.bracketsViewer?.render)
    });

    if (!window.bracketsViewer) {
      setError('brackets-viewer library not loaded');
      console.error('❌ brackets-viewer is not available on window object');
      return;
    }

    try {
      console.log('🎯 BracketsViewerComponent: Starting transformation');
      
      // Use JSONB data if available, otherwise fall back to legacy transformation
      const result = bracket.bracket_data
        ? BracketsViewerAdapter.transformFromJsonb(bracket.bracket_data, bracket.id)
        : BracketsViewerAdapter.transform(bracket, teams, bracket.participants);

      // Store the mapping function in ref
      getPlayoffMatchIdRef.current = result.getPlayoffMatchId;

      console.log('✅ BracketsViewerComponent: Transformation complete', {
        stagesCount: result.data.stages?.length,
        matchesCount: result.data.matches?.length,
        participantsCount: result.data.participants?.length
      });

      console.log('🎨 Rendering brackets-viewer with data:', result.data);

      // Create the onMatchClick handler
      const handleMatchClick = (match: any) => {
        console.log('🎯 Match clicked in brackets-viewer!', {
          matchId: match.id,
          opponent1: match.opponent1,
          opponent2: match.opponent2,
          hasOnMatchClickProp: !!onMatchClick,
          hasMapping: !!getPlayoffMatchIdRef.current
        });

        if (onMatchClick && getPlayoffMatchIdRef.current) {
          const playoffMatchId = getPlayoffMatchIdRef.current(match.id);
          console.log('🔄 Mapping viewer match ID to playoff match:', {
            viewerMatchId: match.id,
            playoffMatchId
          });

          if (playoffMatchId) {
            console.log('✅ Calling onMatchClick with playoff match ID:', playoffMatchId);
            onMatchClick(playoffMatchId);
          } else {
            console.error('❌ Could not map viewer match ID to playoff match:', match.id);
          }
        } else {
          console.warn('⚠️ onMatchClick handler not available:', {
            hasOnMatchClick: !!onMatchClick,
            hasMapping: !!getPlayoffMatchIdRef.current
          });
        }
      };

      console.log('🎨 Calling window.bracketsViewer.render with options');

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
          onMatchClick: handleMatchClick
        }
      );

      console.log('✅ BracketsViewerComponent: Render complete');

      setIsInitialized(true);
      setError(null);
    } catch (err) {
      console.error('❌ Error rendering brackets-viewer:', err);
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
        style={{ minHeight: '400px', pointerEvents: 'auto', border: '2px solid red' }}
      />
      {!isInitialized && (
        <div className="text-center p-8">
          <p className="text-sm text-muted-foreground">Loading bracket...</p>
        </div>
      )}
    </div>
  );
};
