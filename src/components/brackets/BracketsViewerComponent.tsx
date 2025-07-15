import React, { useMemo } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { 
  SingleEliminationBracket, 
  DoubleEliminationBracket,
  Match,
  SVGViewer 
} from "@g-loot/react-tournament-brackets";

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

// Transform bracket data to G-Loot format
const transformToGlootFormat = (data: BracketData): Match[] => {
  if (!data.match || !data.participant) return [];
  
  return data.match.map((match, index) => {
    const participant1 = data.participant.find(p => p.id === match.opponent1?.id);
    const participant2 = data.participant.find(p => p.id === match.opponent2?.id);
    
    return {
      id: match.id,
      name: `Match ${match.number}`,
      nextMatchId: null, // Would need to derive this from the bracket structure
      tournamentRoundText: `Round ${match.round_id}`,
      startTime: new Date().toISOString(),
      state: match.status === 3 ? 'DONE' : 'SCHEDULED',
      participants: [
        {
          id: participant1?.id?.toString() || '',
          name: participant1?.name || 'TBD',
          isWinner: match.opponent1?.result === 'win',
          status: match.opponent1?.result || null,
          resultText: match.opponent1?.score?.toString() || null,
        },
        {
          id: participant2?.id?.toString() || '',
          name: participant2?.name || 'TBD', 
          isWinner: match.opponent2?.result === 'win',
          status: match.opponent2?.result || null,
          resultText: match.opponent2?.score?.toString() || null,
        }
      ]
    };
  });
};

const BracketsViewerComponent: React.FC<BracketsViewerProps> = ({
  data,
  onMatchClick,
  onParticipantClick,
  className,
  config = {},
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Debug logging
  console.log('🔧 BracketsViewerComponent: Rendering with data:', {
    stageCount: data.stage?.length || 0,
    matchCount: data.match?.length || 0,
    participantCount: data.participant?.length || 0,
  });

  // Transform data to G-Loot format
  const glootMatches = useMemo(() => transformToGlootFormat(data), [data]);

  // Determine bracket type
  const isDoubleElimination = useMemo(() => {
    if (!data.stage || data.stage.length === 0) return false;
    return data.stage[0].type === 'double_elimination';
  }, [data.stage]);

  // Handle match click
  const handleMatchClick = (match: Match) => {
    if (onMatchClick) {
      const originalMatch = data.match.find(m => m.id === match.id);
      if (originalMatch) {
        onMatchClick(originalMatch);
      }
    }
  };

  // Theme configuration
  const theme = useMemo(() => ({
    textColor: { main: isDark ? '#ffffff' : '#000000', highlighted: isDark ? '#60a5fa' : '#2563eb', dark: isDark ? '#9ca3af' : '#6b7280' },
    matchBackground: { won: isDark ? '#065f46' : '#dcfce7', lost: isDark ? '#7f1d1d' : '#fecaca' },
    score: { background: { won: isDark ? '#059669' : '#10b981', lost: isDark ? '#dc2626' : '#ef4444' } },
    border: { color: isDark ? '#374151' : '#d1d5db', highlightedColor: isDark ? '#60a5fa' : '#2563eb' },
    roundHeader: { backgroundColor: isDark ? '#1f2937' : '#f9fafb', fontColor: isDark ? '#ffffff' : '#111827' },
    connectorColor: isDark ? '#6b7280' : '#9ca3af',
    connectorColorHighlight: isDark ? '#60a5fa' : '#2563eb',
    svgBackground: isDark ? '#111827' : '#ffffff'
  }), [isDark]);

  if (!data.match || data.match.length === 0) {
    return (
      <div className={cn(
        'brackets-viewer-container',
        'w-full min-h-96 overflow-auto',
        'rounded-lg border bg-card',
        'p-8 flex items-center justify-center',
        className
      )}>
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">No Bracket Data</h3>
          <p className="text-muted-foreground">No matches found in this bracket</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'brackets-viewer-container',
      'w-full min-h-96 overflow-auto',
      'rounded-lg border bg-card',
      'p-4',
      className
    )}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">
          {data.stage?.[0]?.name || 'Tournament Bracket'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {data.participant?.length || 0} participants • {data.match?.length || 0} matches
        </p>
      </div>

      <div className="bracket-content">
        {isDoubleElimination ? (
          <DoubleEliminationBracket
            matches={glootMatches}
            matchComponent={({ match, onMatchClick: onClick, onPartyClick }) => (
              <div 
                className="match-card cursor-pointer p-2 border rounded bg-background hover:bg-accent"
                onClick={() => onClick(match)}
              >
                <div className="text-xs text-muted-foreground mb-1">{match.tournamentRoundText}</div>
                <div className="space-y-1">
                  {match.participants.map((participant, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "text-sm p-1 rounded",
                        participant.isWinner ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {participant.name} {participant.resultText && `(${participant.resultText})`}
                    </div>
                  ))}
                </div>
              </div>
            )}
            onMatchClick={handleMatchClick}
            svgWrapper={({ children, ...props }) => (
              <SVGViewer 
                {...props}
                background={theme.svgBackground}
                SVGBackground={theme.svgBackground}
              >
                {children}
              </SVGViewer>
            )}
            theme={theme}
          />
        ) : (
          <SingleEliminationBracket
            matches={glootMatches}
            matchComponent={({ match, onMatchClick: onClick, onPartyClick }) => (
              <div 
                className="match-card cursor-pointer p-2 border rounded bg-background hover:bg-accent"
                onClick={() => onClick(match)}
              >
                <div className="text-xs text-muted-foreground mb-1">{match.tournamentRoundText}</div>
                <div className="space-y-1">
                  {match.participants.map((participant, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "text-sm p-1 rounded",
                        participant.isWinner ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {participant.name} {participant.resultText && `(${participant.resultText})`}
                    </div>
                  ))}
                </div>
              </div>
            )}
            onMatchClick={handleMatchClick}
            svgWrapper={({ children, ...props }) => (
              <SVGViewer 
                {...props}
                background={theme.svgBackground}
                SVGBackground={theme.svgBackground}
              >
                {children}
              </SVGViewer>
            )}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
};

export default BracketsViewerComponent;