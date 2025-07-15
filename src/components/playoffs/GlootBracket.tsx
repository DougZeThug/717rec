
import React from "react";
import { 
  SingleEliminationBracket, 
  DoubleEliminationBracket,
  Match
} from "@g-loot/react-tournament-brackets";
import { PlayoffBracket, Team } from "@/types/playoffs";
import { adaptPlayoffMatchesToGloot } from "@/services/brackets/glootAdapter";
import { useTheme } from "next-themes";
import { BRACKET_FORMATS } from "@/constants/brackets";
import { getDisplayDivision } from "@/styles/design-system/divisions";
import { useBracketResponsive } from "@/hooks/use-bracket-responsive";
import { BracketTouchControls } from "./mobile/BracketTouchControls";
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
  const responsive = useBracketResponsive();
  
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
    <BracketTouchControls className={`w-full gloot-bracket-container ${divisionClass}`}>
      <div 
        className="overflow-auto"
        style={{
          '--bracket-container-padding': `${responsive.containerPadding}px`,
          '--bracket-match-width': `${responsive.matchCardWidth}px`,
          '--bracket-match-height': `${responsive.matchCardHeight}px`,
          '--bracket-spacing': `${responsive.spacing.md}px`,
          '--bracket-font-size': responsive.fontSize.md,
          '--bracket-min-touch-target': `${responsive.minTouchTarget}px`,
        } as React.CSSProperties}
      >
        <div 
          className={`min-w-max ${responsive.isMobile ? 'p-2' : 'p-4'}`}
          style={{ padding: `${responsive.containerPadding}px` }}
        >
        {bracket.format === BRACKET_FORMATS.DOUBLE ? (
          <DoubleEliminationBracket
            matches={tournament.matches}
            matchComponent={Match}
            onMatchClick={handleMatchClick}
          />
        ) : (
          <SingleEliminationBracket
            matches={tournament.matches}
            matchComponent={Match}
            onMatchClick={handleMatchClick}
          />
        )}
        </div>
      </div>
    </BracketTouchControls>
  );
};

export default GlootBracket;
