import React, { useEffect, useRef, useState } from 'react';
import { PlayoffBracket, PlayoffTeam } from '@/utils/playoffs/playoffTypes';
import { BracketsViewerAdapter, ViewerDataWithMapping } from '@/services/brackets/viewer';
import { InMemoryDatabase } from 'brackets-memory-db';
import { log } from '@/utils/logger';
import { BracketsManagerMatchEditor } from '../match-score-editor/BracketsManagerMatchEditor';

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
  
  // State for brackets-manager match editor
  const [selectedBMMatchId, setSelectedBMMatchId] = useState<number | null>(null);
  const [isBMEditorOpen, setIsBMEditorOpen] = useState(false);
  
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
        
        // Allow BYE matches (one participant) to be clicked for manual scoring
        // Only block if BOTH opponents are missing (match not yet determined)
        if (!match.opponent1?.id && !match.opponent2?.id) {
          console.warn('⚠️ Match clicked but no participants determined yet');
          return;
        }

        // Handle brackets-manager brackets differently
        if (bracket.uses_brackets_manager) {
          console.log('✅ Opening brackets-manager match editor for match:', match.id);
          setSelectedBMMatchId(match.id);
          setIsBMEditorOpen(true);
          return;
        }

        // Handle legacy playoff_matches brackets
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

      // Verify container exists
      const container = containerRef.current;
      if (!container) {
        console.error('❌ Container element not found!');
        setError('Bracket container not ready');
        return;
      }
      
      console.log('✅ Container element exists:', container);
      console.log('🎨 Calling window.bracketsViewer.render with options');
      console.log('📸 Participants with images:', result.data.participants.filter(p => p.image).map(p => ({ id: p.id, name: p.name, image: p.image })));
      console.log('🔍 CONNECTOR DEBUG - Complete data structure:', {
        stagesCount: result.data.stages?.length,
        groupsCount: result.data.groups?.length,
        roundsCount: result.data.rounds?.length,
        matchesCount: result.data.matches?.length,
        participantsCount: result.data.participants?.length
      });
      console.log('🔍 CONNECTOR DEBUG - Groups:', result.data.groups);
      console.log('🔍 CONNECTOR DEBUG - Rounds:', result.data.rounds);
      console.log('🔍 CONNECTOR DEBUG - Stage data:', result.data.stages);

      // Set participant images before rendering (required by brackets-viewer API)
      if (window.bracketsViewer.setParticipantImages) {
        const participantImages = result.data.participants
          .filter(p => p.image)
          .map(p => ({
            participantId: p.id,
            imageUrl: p.image
          }));
        
        if (participantImages.length > 0) {
          console.log('🖼️ Setting participant images:', participantImages);
          window.bracketsViewer.setParticipantImages(participantImages);
        }
      }

      // Prepare data for brackets-viewer (INCLUDE groups/rounds for connector rendering)
      const viewerData = {
        stages: result.data.stages,
        groups: result.data.groups,
        rounds: result.data.rounds,
        matches: result.data.matches,
        matchGames: result.data.matchGames,
        participants: result.data.participants
      };
      
      console.log('🎨 Rendering with complete data including groups/rounds:', {
        stagesCount: viewerData.stages.length,
        groupsCount: viewerData.groups?.length,
        roundsCount: viewerData.rounds?.length,
        matchesCount: viewerData.matches.length,
        sampleMatches: viewerData.matches.slice(5, 8).map(m => ({
          id: m.id,
          round_id: m.round_id,
          group_id: m.group_id,
          opp1_source: m.opponent1?.source_node_id,
          opp2_source: m.opponent2?.source_node_id
        }))
      });

      // Render using brackets-viewer v1.8.1 with try/catch
      try {
        window.bracketsViewer.render(
          viewerData,
          {
          selector: '#brackets-viewer-container',
          clear: true,
          participantOriginPlacement: 'before',
          separatedChildCountLabel: true,
          showSlotsOrigin: true,
          showLowerBracketSlotsOrigin: true,
          highlightParticipantOnHover: true,
          onMatchClick: handleMatchClick,
          customRoundName: (info: any) => {
            const { groupType, roundNumber, roundCount } = info;
            
            // Grand Final
            if (groupType === 'final-group') {
              return roundNumber === 1 ? 'Grand Final' : 'Grand Final - Round 2';
            }
            
            // Winners Bracket
            if (groupType === 'winner-bracket') {
              if (roundNumber === roundCount) return 'Winners Final';
              if (roundNumber === roundCount - 1) return 'Winners Semi-Final';
              return `Winners Round ${roundNumber}`;
            }
            
            // Losers Bracket
            if (groupType === 'loser-bracket') {
              if (roundNumber === roundCount) return 'Losers Final';
              if (roundNumber === roundCount - 1) return 'Losers Semi-Final';
              return `Losers Round ${roundNumber}`;
            }
            
            return `Round ${roundNumber}`;
          }
        }
      );
      
      console.log('✅ brackets-viewer.render() completed successfully');
      } catch (renderError) {
        console.error('❌ brackets-viewer.render() threw an error:', renderError);
        setError('Failed to render bracket visualization');
        return;
      }

        console.log('✅ BracketsViewerComponent: Render complete');
        
        // Debug: Check if connector SVG elements exist with enhanced debugging
        setTimeout(() => {
          const container = containerRef.current;
          if (!container) return;
          
          // Check for bracket structure and match elements
          const bracket = container.querySelector('.bracket');
          const matches = container.querySelectorAll('.match');
          const stages = container.querySelectorAll('.stage');
          
          // Check for ALL SVG-related elements
          const allSvgs = container.querySelectorAll('svg');
          const allPaths = container.querySelectorAll('path');
          const allLines = container.querySelectorAll('line');
          const allPolylines = container.querySelectorAll('polyline');
          
          console.log('🔍 POST-RENDER CHECK:', {
            hasBracketElement: !!bracket,
            stageCount: stages.length,
            matchCount: matches.length,
            svgCount: allSvgs.length,
            pathCount: allPaths.length,
            lineCount: allLines.length,
            polylineCount: allPolylines.length,
            containerHTMLLength: container.innerHTML.length
          });
          
          if (matches.length === 0) {
            console.error('❌ No matches rendered - brackets-viewer failed silently');
            console.log('🔍 Container HTML preview:', container.innerHTML.substring(0, 1000));
          } else {
            console.log('✅ Matches rendered successfully!');
          }
          
          // Log first SVG structure if it exists
          if (allSvgs.length > 0) {
            console.log('🔍 First SVG element:', allSvgs[0].outerHTML.substring(0, 500));
          } else {
            console.warn('⚠️ No SVG elements found - connectors missing');
          }
          
          // Check for connector class specifically
          const connectors = container.querySelectorAll('.connector, [class*="connector"]');
          console.log('🔍 Elements with .connector class:', connectors.length);
          
          if (connectors.length === 0 && matches.length > 0) {
            console.warn('⚠️ Matches exist but no connector elements found!');
          }
          
          // Hide bracket ID if it's showing
          const allText = container.querySelectorAll('*:not(script):not(style)');
          allText.forEach(el => {
            const text = el.textContent || '';
            // UUID pattern: 8-4-4-4-12 hex characters
            if (/^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/i.test(text.trim())) {
              console.log('🔍 Hiding bracket ID element:', el);
              (el as HTMLElement).style.display = 'none';
            }
          });
        }, 1000);

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
    <>
      <div className="w-full overflow-x-auto overflow-y-visible" style={{ backgroundColor: 'var(--bv-primary-bg, #101213)' }}>
        <div 
          ref={containerRef}
          id="brackets-viewer-container"
          className="brackets-viewer p-4 md:p-8 font-bebas"
          style={{ 
            minHeight: '400px', 
            minWidth: 'fit-content',
            width: 'max-content',
            overflow: 'visible',
            pointerEvents: 'auto',
            transform: 'scale(1)',
            transformOrigin: 'top left',
            backgroundColor: 'var(--bv-primary-bg, #101213)'
          }}
        />
        {!isInitialized && (
          <div className="text-center p-8">
            <p className="text-sm text-muted-foreground">Loading bracket...</p>
          </div>
        )}
      </div>

      {/* Brackets-manager match editor */}
      <BracketsManagerMatchEditor
        matchId={selectedBMMatchId}
        bracketId={bracket.id}
        isOpen={isBMEditorOpen}
        onClose={() => {
          setIsBMEditorOpen(false);
          setSelectedBMMatchId(null);
        }}
      />
    </>
  );
};
