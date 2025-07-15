
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
import { createDivisionGlootTheme } from "@/styles/brackets/glootTheme";
import { getDisplayDivision } from "@/styles/design-system/divisions";
import "@/styles/brackets.css";

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
  
  // Get division for theming
  const division = bracket.division;
  const displayDivision = getDisplayDivision(division || '');
  
  // Create theme using design system
  const theme = createDivisionGlootTheme(division, isDark);
  
  // Get division-specific CSS class
  const divisionClass = displayDivision ? `bracket-${displayDivision.toLowerCase()}` : '';
  
  if (!tournament.matches.length) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">No matches found for this bracket</p>
      </div>
    );
  }
  
  return (
    <div className={`w-full overflow-auto gloot-bracket-container ${divisionClass}`}>
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
