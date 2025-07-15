
import React from "react";
import { 
  SingleEliminationBracket, 
  DoubleEliminationBracket,
  Match,
  SVGViewer 
} from "@g-loot/react-tournament-brackets";
import { PlayoffBracket, Team } from "@/types/playoffs";
import { adaptPlayoffMatchesToGloot } from "@/services/brackets/glootAdapter";
import { useTheme } from "next-themes";
import { BRACKET_FORMATS } from "@/constants/brackets";

interface GlootBracketProps {
  bracket: PlayoffBracket;
  teams: Team[];
  onEditMatch?: (matchId: string) => void;
}

/**
 * Modern bracket component using @g-loot/react-tournament-brackets
 */
const GlootBracket: React.FC<GlootBracketProps> = ({
  bracket,
  teams,
  onEditMatch
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  
  // Convert our data to @g-loot format
  const tournament = adaptPlayoffMatchesToGloot(
    bracket.matches || [],
    teams,
    bracket.name || "Tournament",
    bracket.format
  );
  
  // Handle match click events
  const handleMatchClick = (match: Match) => {
    if (onEditMatch && match.id) {
      onEditMatch(match.id);
    }
  };
  
  // Theme configuration
  const theme = {
    textColor: { main: isDark ? '#e5e7eb' : '#374151', highlighted: isDark ? '#ffffff' : '#111827', dark: isDark ? '#9ca3af' : '#6b7280' },
    matchBackground: { wonColor: isDark ? '#065f46' : '#d1fae5', lostColor: isDark ? '#7f1d1d' : '#fee2e2' },
    score: { background: { wonColor: isDark ? '#059669' : '#10b981', lostColor: isDark ? '#dc2626' : '#ef4444' } },
    border: { color: isDark ? '#4b5563' : '#d1d5db', highlightedColor: isDark ? '#6b7280' : '#9ca3af' },
    roundHeader: { backgroundColor: isDark ? '#374151' : '#f3f4f6', fontColor: isDark ? '#e5e7eb' : '#374151' },
    connectorColor: isDark ? '#6b7280' : '#9ca3af',
    connectorColorHighlight: isDark ? '#9ca3af' : '#6b7280'
  };
  
  if (!tournament.matches.length) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">No matches found for this bracket</p>
      </div>
    );
  }
  
  return (
    <div className="w-full overflow-auto">
      <div className="min-w-max p-4">
        {bracket.format === BRACKET_FORMATS.DOUBLE ? (
          <DoubleEliminationBracket
            matches={tournament.matches}
            matchComponent={Match}
            theme={theme}
            options={{
              style: {
                roundHeader: { backgroundColor: theme.roundHeader.backgroundColor, fontColor: theme.roundHeader.fontColor },
                connectorColor: theme.connectorColor,
                connectorColorHighlight: theme.connectorColorHighlight
              }
            }}
            onMatchClick={handleMatchClick}
            svgWrapper={({ children, ...props }) => (
              <SVGViewer background={isDark ? '#1f2937' : '#ffffff'} {...props}>
                {children}
              </SVGViewer>
            )}
          />
        ) : (
          <SingleEliminationBracket
            matches={tournament.matches}
            matchComponent={Match}
            theme={theme}
            options={{
              style: {
                roundHeader: { backgroundColor: theme.roundHeader.backgroundColor, fontColor: theme.roundHeader.fontColor },
                connectorColor: theme.connectorColor,
                connectorColorHighlight: theme.connectorColorHighlight
              }
            }}
            onMatchClick={handleMatchClick}
            svgWrapper={({ children, ...props }) => (
              <SVGViewer background={isDark ? '#1f2937' : '#ffffff'} {...props}>
                {children}
              </SVGViewer>
            )}
          />
        )}
      </div>
    </div>
  );
};

export default GlootBracket;
