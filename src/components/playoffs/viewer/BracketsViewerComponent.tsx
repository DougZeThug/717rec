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
  // Guard: Require valid bracket with ID
  if (!bracket || !bracket.id) {
    console.error('❌ BracketsViewerComponent: Invalid bracket prop', bracket);
    return (
      <div className="text-center p-8 text-red-500">
        <p>Cannot render bracket: Invalid data</p>
      </div>
    );
  }

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const getPlayoffMatchIdRef = useRef<((id: number) => string | undefined) | null>(null);
  const renderCount = useRef(0);
  const lastFingerprintRef = useRef<string | null>(null);
  const hasRenderedRef = useRef(false);
  const isMountingRef = useRef(true);
  
  const containerId = 'brackets-viewer-container';
  
  // Fingerprint function to detect identical data
  const fingerprint = (matches: any[]): string => {
    const ids = matches.map(x => x.id).join(',');
    const sourced = matches.reduce((n, x) =>
      n + (x?.opponent1?.source_node_id ? 1 : 0) + (x?.opponent2?.source_node_id ? 1 : 0), 0);
    return `${matches.length}:${sourced}:${ids}`;
  };
  
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
    isMountingRef.current = false;
    return () => {
      log('❌ BracketsViewerComponent UNMOUNTED');
    };
  }, []);

  useEffect(() => {
    log('🔍 BracketsViewerComponent: useEffect triggered', {
      hasContainer: !!containerRef.current,
      hasBracket: !!bracket,
      bracketId: bracket?.id,
      teamsCount: teams.length,
      onMatchClickChanged: !!onMatchClick
    });

    // Skip render if component is still mounting and data is incomplete
    if (isMountingRef.current && (!bracket?.id || !teams.length)) {
      console.warn('⏭️ Skipping render: component still mounting with incomplete data');
      return;
    }

    // Guard: require container, bracket, and teams
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
        // Wait for fonts to be ready (CRITICAL FIX for layout/connector timing)
        console.log('⏳ Waiting for fonts to load...');
        await document.fonts.ready;
        console.log('✅ Fonts loaded');

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
      
      // Guard: validate data structure before rendering
      const m = result.data.matches;
      const s = result.data.stages;
      
      if (!Array.isArray(m) || m.length === 0 || !Array.isArray(s) || s.length === 0) {
        console.warn('⏭️ Skipping render: matches or stages not ready', {
          hasMatches: Array.isArray(m) && m.length,
          hasStages: Array.isArray(s) && s.length,
        });
        return;
      }
      
      // Validate source coverage (avoid premature render)
      const totalSlots = m.length * 2;
      const sourcedCount = m.reduce((n, x) =>
        n + (x?.opponent1?.source_node_id ? 1 : 0) + (x?.opponent2?.source_node_id ? 1 : 0), 0);
      const sourcePct = totalSlots ? sourcedCount / totalSlots : 0;
      
      if (sourcePct < 0.6) {
        console.warn('⏭️ Skipping render: insufficient sources', { 
          matches: m.length, 
          sourced: sourcedCount, 
          pct: Math.round(sourcePct * 100) + '%' 
        });
        return;
      }
      
      // Prevent duplicate re-renders on identical data
      const fp = fingerprint(m);
      if (lastFingerprintRef.current === fp) {
        console.log('🧩 No-op: identical fingerprint, skipping render');
        return;
      }
      lastFingerprintRef.current = fp;

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

      // Diagnostic logging for connector debugging
      const totalOpps = viewerData.matches.reduce(
        (n, m) => n + (m.opponent1 ? 1 : 0) + (m.opponent2 ? 1 : 0), 
        0
      );
      const sourced = viewerData.matches.reduce(
        (n, m) => n + (m.opponent1?.source_node_id ? 1 : 0) + (m.opponent2?.source_node_id ? 1 : 0), 
        0
      );
      console.log('🔗 Connector Stats:', { 
        totalOpponents: totalOpps, 
        withSources: sourced,
        percentage: totalOpps > 0 ? Math.round((sourced / totalOpps) * 100) + '%' : '0%'
      });

      // ========== PRE-RENDER IDENTITY CHECKS ==========
      
      // Sample matches to verify Symbol identity tags survived
      const takeSample = (arr: any[]) => arr.slice(0, 5).map(m => {
        const o1Syms = m.opponent1 ? Object.getOwnPropertySymbols(m.opponent1) : [];
        const o2Syms = m.opponent2 ? Object.getOwnPropertySymbols(m.opponent2) : [];
        return {
          id: m.id,
          o1_src: m.opponent1?.source_node_id,
          o1_tag: o1Syms.length ? m.opponent1[o1Syms[0]] : 'NO_TAG',
          o2_src: m.opponent2?.source_node_id,
          o2_tag: o2Syms.length ? m.opponent2[o2Syms[0]] : 'NO_TAG',
        };
      });
      console.log('🧪 PRE-RENDER SAMPLE', takeSample(viewerData.matches));

      // Verify array identity (should be same reference from adapter)
      console.log('🧪 SAME ARRAY FROM ADAPTER?', viewerData.matches === result.data.matches);

      // Check if symbol tags survived
      const tagsMissing = viewerData.matches.filter(m => {
        const need1 = !!m.opponent1;
        const need2 = !!m.opponent2;
        const bad1 = m.opponent1 && Object.getOwnPropertySymbols(m.opponent1).length === 0;
        const bad2 = m.opponent2 && Object.getOwnPropertySymbols(m.opponent2).length === 0;
        return (need1 && bad1) || (need2 && bad2);
      }).length;

      if (tagsMissing > 0) {
        console.error('❌ IDENTITY TAGS MISSING - object identity was lost', { tagsMissing });
        setError('Bracket data integrity failed: identity tags missing');
        return;
      }

      // Audit: try to read version and script src
      const bv = (window as any).bracketsViewer;
      const scriptEl = Array.from(document.scripts).find(s =>
        s.src && /brackets-viewer/i.test(s.src));
      console.log('🌐 BV VERSION (if any):', bv?.version ?? 'unknown');
      console.log('🌐 BV SCRIPT SRC:', scriptEl?.src ?? 'not found');

      // Audit: probe for connector-ish methods/symbols
      const keys = bv ? Object.keys(bv).filter(k => /connect|connector|edge|link|draw/i.test(k)) : [];
      console.log('🧪 BV CONNECTOR KEYS:', keys);
      
      console.log('⚙️ RENDER OPTIONS:', {
        showSlotsOrigin: true,
        showLowerBracketSlotsOrigin: true,
        clear: true,
        selector: '#brackets-viewer-container'
      });

      // Install MutationObserver to catch connector DOM insertions
      const renderContainer = containerRef.current;
      if (renderContainer) {
        const mo = new MutationObserver((mutations) => {
          for (const mut of mutations) {
            const added = Array.from(mut.addedNodes || []);
            const hasConnector = added.some((n: any) => {
              if (n?.nodeType !== 1) return false;
              const t = n.tagName?.toLowerCase();
              const cls = n.className || '';
              return t === 'svg' || t === 'path' || t === 'polyline' || t === 'line' || 
                     String(cls).includes('connector') ||
                     n.querySelector?.('svg, path, polyline, line, .connector');
            });
            if (hasConnector) {
              console.log('🧿 CONNECTOR DOM ADDED via MutationObserver');
            }
          }
        });
        mo.observe(renderContainer, { childList: true, subtree: true });
        console.log('👁️ Connector MutationObserver active on', renderContainer.id);
        
        // Cleanup after 5 seconds
        setTimeout(() => {
          mo.disconnect();
          console.log('👁️ MutationObserver disconnected');
        }, 5000);
      }

      // Render using brackets-viewer v1.8.1 with try/catch
      console.log('🎨 Calling bracketsViewer.render with', {
        matches: viewerData.matches.length,
        sourced: sourcedCount,
        clearFlag: !hasRenderedRef.current
      });
      
      try {
        window.bracketsViewer.render(
          viewerData,
          {
          selector: '#brackets-viewer-container',
          clear: !hasRenderedRef.current, // Only clear on first render
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
      
      // Connector readiness check
      const totalSlots = viewerData.matches.length * 2;
      const sourcedSlots = viewerData.matches.reduce((count, m) => {
        let c = count;
        if (m.opponent1?.source_node_id) c++;
        if (m.opponent2?.source_node_id) c++;
        return c;
      }, 0);
      
      const sourcePercentage = Math.round((sourcedSlots / totalSlots) * 100);
      console.log('🧪 CONNECTOR READINESS:', {
        totalSlots,
        sourcedSlots,
        percentage: `${sourcePercentage}%`,
        note: 'First round has no sources (expected)'
      });
      
      hasRenderedRef.current = true;
      console.log('✅ brackets-viewer.render() completed successfully');
      
      // Force connector recalculation (CRITICAL FIX for layout reflow)
      console.log('🔄 Dispatching resize event for connector recalc');
      window.dispatchEvent(new Event('resize'));
      
      } catch (renderError) {
        console.error('❌ brackets-viewer.render() threw an error:', renderError);
        setError('Failed to render bracket visualization');
        return;
      }

        console.log('✅ BracketsViewerComponent: Render complete');
        
        // Check for CSS-based connectors (not SVG)
        setTimeout(() => {
          const container = containerRef.current;
          if (!container) return;
          
          const matches = container.querySelectorAll('.match');
          const connectNext = container.querySelectorAll('.connect-next').length;
          const connectPrevious = container.querySelectorAll('.connect-previous').length;
          const hasConnectorClasses = connectNext + connectPrevious;
          
          const domAudit = {
            matchCount: matches.length,
            connectNextCount: connectNext,
            connectPreviousCount: connectPrevious,
            totalConnectorClasses: hasConnectorClasses,
            // Legacy counts (should be 0 for CSS-based viewer)
            svgCount: container.querySelectorAll('svg').length,
            pathCount: container.querySelectorAll('path, line, polyline').length
          };
          
          console.log('🔍 POST-RENDER DOM AUDIT (CSS connectors):', domAudit);
          
          if (domAudit.matchCount === 0) {
            console.error('❌ No matches rendered - brackets-viewer failed silently');
            console.log('🔍 Container HTML preview:', container.innerHTML.substring(0, 1000));
          } else if (hasConnectorClasses === 0) {
            console.warn('⚠️ No .connect-next or .connect-previous classes found - CSS connectors may not be rendering');
            console.log('📋 Sample match HTML:', matches[0]?.outerHTML?.substring(0, 300));
          } else {
            console.log('✅ CSS connector classes detected!', {
              connectNext: connectNext,
              connectPrevious: connectPrevious
            });
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
  }, [bracket?.id, bracket?.uses_brackets_manager, bracket?.bracket_data, teams.length, onMatchClick]);

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
      <div className="w-full overflow-x-auto overflow-y-visible" style={{ backgroundColor: 'var(--primary-background, #ffffff)' }}>
        <div ref={wrapperRef} id="brackets-wrapper" style={{ position: 'relative' }}>
          <div 
            ref={containerRef}
            id={containerId}
            className="brackets-viewer p-4 md:p-8 font-bebas"
            style={{ 
              position: 'relative',
              minHeight: '400px', 
              minWidth: 'fit-content',
              width: 'max-content',
              overflow: 'visible',
              pointerEvents: 'auto',
              transform: 'scale(1)',
              transformOrigin: 'top left',
              backgroundColor: 'var(--primary-background, #ffffff)'
            }}
          />
        </div>
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
