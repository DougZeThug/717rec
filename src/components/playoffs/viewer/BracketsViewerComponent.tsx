import React, { useEffect, useRef, useState } from 'react';
import { PlayoffBracket, PlayoffTeam } from '@/utils/playoffs/playoffTypes';
import { BracketsViewerAdapter, ViewerDataWithMapping } from '@/services/brackets/viewer';
import { InMemoryDatabase } from 'brackets-memory-db';
import { log } from '@/utils/logger';

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
  const renderCount = useRef(0);
  
  renderCount.current++;
  log(`🎨 BracketsViewerComponent render #${renderCount.current}`, {
    bracketId: bracket?.id,
    teamsCount: teams?.length
  });
  
  // Track component lifecycle
  useEffect(() => {
    log('✅ BracketsViewerComponent MOUNTED');
    return () => {
      log('❌ BracketsViewerComponent UNMOUNTED');
    };
  }, []);

  useEffect(() => {
    log('🔍 BracketsViewerComponent: useEffect triggered', {
      hasContainer: !!containerRef.current,
      hasBracket: !!bracket,
      teamsCount: teams.length,
      bracketId: bracket?.id,
      onMatchClickChanged: !!onMatchClick
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

    const renderBracket = async () => {
      try {
        console.log('🎯 BracketsViewerComponent: Starting transformation', {
          usesBracketsManager: bracket.uses_brackets_manager,
          hasBracketData: !!bracket.bracket_data
        });
        
        // Determine which transformation method to use
        let result: ViewerDataWithMapping;
        
        if (bracket.uses_brackets_manager) {
          // Fetch from brackets-manager SQL tables
          console.log('📊 Using brackets-manager SQL storage');
          result = await BracketsViewerAdapter.transformFromSql(bracket.id);
        } else if (bracket.bracket_data) {
          // Use JSONB data
          console.log('📊 Using JSONB bracket_data');
          result = BracketsViewerAdapter.transformFromJsonb(bracket.bracket_data, bracket.id);
        } else {
          // Legacy: Use playoff_matches table
          console.log('📊 Using legacy playoff_matches table');
          result = BracketsViewerAdapter.transform(bracket, teams, bracket.participants);
        }

        // Store the mapping function in ref
        getPlayoffMatchIdRef.current = result.getPlayoffMatchId;

      console.log('✅ BracketsViewerComponent: Transformation complete', {
        stagesCount: result.data.stages?.length,
        matchesCount: result.data.matches?.length,
        participantsCount: result.data.participants?.length
      });

      console.log('🎨 Rendering brackets-viewer with data:', result.data);

      // Create the onMatchClick handler with participant validation
      const handleMatchClick = (match: any) => {
        console.log('🎯 Match clicked in brackets-viewer!', {
          matchId: match.id,
          opponent1: match.opponent1,
          opponent2: match.opponent2,
          status: match.status,
          usesBracketsManager: bracket.uses_brackets_manager
        });
        
        // Brackets using brackets-manager SQL tables don't have playoff_matches records
        // so we can't open the match editor for them
        if (bracket.uses_brackets_manager) {
          console.warn('⚠️ Match editing not supported for brackets-manager brackets');
          return;
        }
        
        // Check if match has both participants
        if (!match.opponent1?.id || !match.opponent2?.id) {
          console.warn('⚠️ Match clicked but participants not determined yet');
          return;
        }

        if (onMatchClick && getPlayoffMatchIdRef.current) {
          const playoffMatchId = getPlayoffMatchIdRef.current(match.id);
          
          if (playoffMatchId) {
            console.log('✅ Calling onMatchClick with playoff match ID:', playoffMatchId);
            onMatchClick(playoffMatchId);
          } else {
            console.error('❌ Could not map viewer match ID to playoff match:', match.id);
          }
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
    };

    renderBracket();

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
        style={{ minHeight: '400px', pointerEvents: 'auto' }}
      />
      {!isInitialized && (
        <div className="text-center p-8">
          <p className="text-sm text-muted-foreground">Loading bracket...</p>
        </div>
      )}
    </div>
  );
};
