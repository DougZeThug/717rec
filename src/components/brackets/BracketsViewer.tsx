
import React, { useEffect, useRef } from 'react';
import { BracketsViewer } from 'brackets-viewer';
import { SimpleBracketData } from '@/hooks/brackets/useBracketData';
import { useTheme } from 'next-themes';

interface BracketsViewerComponentProps {
  bracket: SimpleBracketData;
  onMatchClick?: (matchId: string) => void;
}

interface BracketsViewerMatch {
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
    name?: string;
    result?: 'win' | 'loss' | null;
    score?: number;
  } | null;
  opponent2: {
    id: number | null;
    position?: number;
    name?: string;
    result?: 'win' | 'loss' | null;
    score?: number;
  } | null;
}

interface BracketsViewerData {
  stage: Array<{
    id: number;
    tournament_id: number;
    name: string;
    type: string;
    number: number;
    settings: {
      seedOrdering: string[];
      grandFinal: string;
      skipFirstRound: boolean;
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
    name?: string;
  }>;
  match: BracketsViewerMatch[];
  match_game: Array<{
    id: number;
    number: number;
    stage_id: number;
    parent_id: number;
    status: number;
    opponent1: any;
    opponent2: any;
  }>;
  participant: Array<{
    id: number;
    tournament_id: number;
    name: string;
  }>;
}

const BracketsViewerComponent: React.FC<BracketsViewerComponentProps> = ({
  bracket,
  onMatchClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<BracketsViewer | null>(null);
  const { resolvedTheme } = useTheme();

  // Transform our bracket data to brackets-viewer format
  const transformBracketData = (bracket: SimpleBracketData): BracketsViewerData => {
    console.log('Transforming bracket data:', bracket);

    // Create participants from teams
    const participants = bracket.teams.map((team, index) => ({
      id: index + 1,
      tournament_id: 1,
      name: team.name
    }));

    // Group matches by type
    const winnerMatches = bracket.matches.filter(m => m.matchType === 'winners' || m.matchType === 'winner');
    const loserMatches = bracket.matches.filter(m => m.matchType === 'losers' || m.matchType === 'loser');
    const finalMatches = bracket.matches.filter(m => m.matchType === 'finals' || m.matchType === 'final');

    // Create groups (winner, loser, final)
    const groups = [
      { id: 1, stage_id: 1, number: 1, name: 'Winner Bracket' },
      { id: 2, stage_id: 1, number: 2, name: 'Loser Bracket' },
      { id: 3, stage_id: 1, number: 3, name: 'Final' }
    ];

    // Create rounds
    const rounds: any[] = [];
    let roundId = 1;

    // Winner bracket rounds
    const winnerRounds = Math.max(...winnerMatches.map(m => m.round), 0);
    for (let i = 1; i <= winnerRounds; i++) {
      rounds.push({
        id: roundId++,
        number: i,
        stage_id: 1,
        group_id: 1,
        name: `WR${i}`
      });
    }

    // Loser bracket rounds
    const loserRounds = Math.max(...loserMatches.map(m => m.round), 0);
    for (let i = 1; i <= loserRounds; i++) {
      rounds.push({
        id: roundId++,
        number: i,
        stage_id: 1,
        group_id: 2,
        name: `LR${i}`
      });
    }

    // Final round
    if (finalMatches.length > 0) {
      rounds.push({
        id: roundId++,
        number: 1,
        stage_id: 1,
        group_id: 3,
        name: 'Final'
      });
    }

    // Transform matches
    const transformedMatches: BracketsViewerMatch[] = bracket.matches.map((match, index) => {
      const getParticipantId = (teamName?: string) => {
        if (!teamName) return null;
        const participant = participants.find(p => p.name === teamName);
        return participant ? participant.id : null;
      };

      const getGroupId = () => {
        if (match.matchType === 'winners' || match.matchType === 'winner') return 1;
        if (match.matchType === 'losers' || match.matchType === 'loser') return 2;
        return 3; // finals
      };

      const team1Id = getParticipantId(match.team1Name);
      const team2Id = getParticipantId(match.team2Name);

      return {
        id: index + 1,
        number: match.position || index + 1,
        stage_id: 1,
        group_id: getGroupId(),
        round_id: match.round,
        child_count: 0,
        status: match.status === 'completed' ? 4 : 2, // 2 = ready, 4 = completed
        opponent1: team1Id ? {
          id: team1Id,
          name: match.team1Name,
          result: match.winnerId === match.team1Id ? 'win' : match.winnerId ? 'loss' : null,
          score: match.team1Score || undefined
        } : null,
        opponent2: team2Id ? {
          id: team2Id,
          name: match.team2Name,
          result: match.winnerId === match.team2Id ? 'win' : match.winnerId ? 'loss' : null,
          score: match.team2Score || undefined
        } : null
      };
    });

    return {
      stage: [{
        id: 1,
        tournament_id: 1,
        name: bracket.name,
        type: 'double_elimination',
        number: 1,
        settings: {
          seedOrdering: ['natural'],
          grandFinal: 'double',
          skipFirstRound: false
        }
      }],
      group: groups,
      round: rounds,
      match: transformedMatches,
      match_game: [],
      participant: participants
    };
  };

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Clear any existing viewer
      if (viewerRef.current) {
        containerRef.current.innerHTML = '';
      }

      // Transform data
      const viewerData = transformBracketData(bracket);
      console.log('Viewer data:', viewerData);

      // Create new viewer
      viewerRef.current = new BracketsViewer();
      
      // Render the bracket
      viewerRef.current.render(
        {
          stages: viewerData.stage,
          groups: viewerData.group,
          rounds: viewerData.round,
          matches: viewerData.match,
          matchGames: viewerData.match_game,
          participants: viewerData.participant
        },
        {
          selector: containerRef.current,
          participantOriginPlacement: 'before',
          separatedChildCountLabel: true,
          showSlotsOrigin: true,
          showLowerBracketSlotsOrigin: true,
          highlightParticipantOnHover: true
        }
      );

      // Add click handlers
      const matchElements = containerRef.current.querySelectorAll('.match');
      matchElements.forEach((element, index) => {
        element.addEventListener('click', () => {
          if (onMatchClick && bracket.matches[index]) {
            onMatchClick(bracket.matches[index].id);
          }
        });
      });

    } catch (error) {
      console.error('Error rendering brackets-viewer:', error);
      // Fallback: show error message
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div class="flex items-center justify-center p-8 text-center">
            <div class="space-y-2">
              <p class="text-lg font-medium text-red-600">Failed to render bracket</p>
              <p class="text-sm text-gray-500">Using fallback bracket display</p>
            </div>
          </div>
        `;
      }
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [bracket, onMatchClick, resolvedTheme]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {bracket.name}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {bracket.format} • {bracket.state}
        </p>
      </div>

      {/* Brackets Viewer Container */}
      <div 
        ref={containerRef}
        className="brackets-viewer-container w-full overflow-auto bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
        style={{ minHeight: '400px' }}
      />

      {/* Custom CSS for brackets-viewer styling */}
      <style jsx>{`
        .brackets-viewer-container :global(.bracket) {
          font-family: inherit;
        }
        
        .brackets-viewer-container :global(.match) {
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .brackets-viewer-container :global(.match:hover) {
          transform: scale(1.02);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .brackets-viewer-container :global(.participant) {
          font-size: 14px;
        }
        
        ${resolvedTheme === 'dark' ? `
          .brackets-viewer-container :global(.match) {
            background-color: #374151 !important;
            border-color: #4B5563 !important;
            color: #F9FAFB !important;
          }
          
          .brackets-viewer-container :global(.participant) {
            color: #F9FAFB !important;
          }
          
          .brackets-viewer-container :global(.connector) {
            stroke: #6B7280 !important;
          }
        ` : ''}
      `}</style>
    </div>
  );
};

export default BracketsViewerComponent;
