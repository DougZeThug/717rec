
import React from "react";
import { 
  SingleEliminationBracket, 
  DoubleEliminationBracket,
  Match,
  SVGViewer
} from "@g-loot/react-tournament-brackets";
import { PlayoffBracket, Team } from "@/types/playoffs";
import { adaptPlayoffMatchesToGloot, adaptToDoubleEliminationFormat } from "@/services/brackets/glootAdapter";
import { useTheme } from "next-themes";
import { BRACKET_FORMATS } from "@/constants/brackets";
import { getDisplayDivision } from "@/styles/design-system/divisions";
import { useBracketResponsive } from "@/hooks/use-bracket-responsive";
import { useBracketDimensions } from "@/hooks/use-bracket-dimensions";
import { useWindowSize } from "@/hooks/useWindowSize";
import { ChallongeBracketDirect } from "./ChallongeBracketDirect";
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
  const [windowWidth, windowHeight] = useWindowSize();
  
  // Warn if receiving brackets-manager bracket (should use BracketsViewerComponent instead)
  if (bracket.uses_brackets_manager) {
    console.warn('⚠️ GlootBracket: Received brackets-manager bracket - should use BracketsViewerComponent instead');
  }

  // DEBUG: Log component props and data
  console.log('🏀 GlootBracket: Component props:', {
    bracket: bracket ? {
      id: bracket.id,
      name: bracket.name,
      format: bracket.format,
      matchesCount: bracket.matches?.length,
      matchesIsArray: Array.isArray(bracket.matches),
      challonge_tournament_id: bracket.challonge_tournament_id,
      hasChallongeId: !!bracket.challonge_tournament_id,
      challengeIdType: typeof bracket.challonge_tournament_id,
      uses_brackets_manager: bracket.uses_brackets_manager,
      allBracketKeys: Object.keys(bracket),
      firstFewMatches: bracket.matches?.slice(0, 3).map(m => ({
        id: m.id,
        team1Id: m.team1Id,
        team2Id: m.team2Id,
        round: m.round,
        matchType: m.matchType,
        status: m.status
      }))
    } : null,
    teamsCount: teams?.length,
    teamsArray: teams?.map(t => ({ id: t.id, name: t.name })),
    onEditMatch: !!onEditMatch
  });
  
  // Convert our data to @g-loot format
  const isDoubleElimination = bracket.format === BRACKET_FORMATS.DOUBLE;
  
  const tournament = isDoubleElimination 
    ? null 
    : adaptPlayoffMatchesToGloot(
        bracket.matches || [],
        teams,
        bracket.name || "Tournament",
        bracket.format
      );
  
  const doubleEliminationData = isDoubleElimination
    ? adaptToDoubleEliminationFormat(
        bracket.matches || [],
        teams,
        bracket.name || "Tournament"
      )
    : null;
  
  // DEBUG: Log tournament data
  console.log('🏀 GlootBracket: Tournament data:', {
    isDoubleElimination,
    tournament,
    doubleEliminationData,
    totalMatches: tournament?.matches?.length || (doubleEliminationData ? doubleEliminationData.upper.length + doubleEliminationData.lower.length : 0),
    bracketFormat: bracket.format
  });
  
  // Get bracket dimensions for auto-fit
  const totalMatches = tournament?.matches?.length || (doubleEliminationData ? doubleEliminationData.upper.length + doubleEliminationData.lower.length : 0);
  const bracketDimensions = useBracketDimensions(
    totalMatches,
    bracket.format || 'single'
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
  
  // Check if this is a Challonge tournament and use direct display
  console.log('🎯 CRITICAL CHECK: About to check challonge_tournament_id:', {
    value: bracket.challonge_tournament_id,
    type: typeof bracket.challonge_tournament_id,
    truthy: !!bracket.challonge_tournament_id,
    condition: bracket.challonge_tournament_id
  });
  
  if (bracket.challonge_tournament_id) {
    console.log('🏀 GlootBracket: Using Challonge direct display for tournament:', bracket.challonge_tournament_id);
    return (
      <ChallongeBracketDirect
        tournamentId={bracket.challonge_tournament_id}
        onEditMatch={onEditMatch}
      />
    );
  } else {
    console.log('🎯 CRITICAL: challonge_tournament_id is falsy, proceeding with old bracket flow');
  }
  
  if (isDoubleElimination && (!doubleEliminationData || (doubleEliminationData.upper.length === 0 && doubleEliminationData.lower.length === 0))) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">No matches found for this bracket</p>
      </div>
    );
  }
  
  if (!isDoubleElimination && (!tournament || !tournament.matches.length)) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">No matches found for this bracket</p>
      </div>
    );
  }
  
  // Calculate responsive dimensions for SVGViewer
  const finalWidth = Math.max(windowWidth - 50, 500);
  const finalHeight = Math.max(windowHeight - 100, 500);

  return (
    <div className={`w-full h-full gloot-bracket-container ${divisionClass}`}>
      {isDoubleElimination && doubleEliminationData ? (
        <DoubleEliminationBracket
          matches={doubleEliminationData}
          matchComponent={Match}
          onMatchClick={handleMatchClick}
          svgWrapper={({ children, ...props }) => (
            <SVGViewer width={finalWidth} height={finalHeight} {...props}>
              {children}
            </SVGViewer>
          )}
        />
      ) : tournament ? (
        <SingleEliminationBracket
          matches={tournament.matches}
          matchComponent={Match}
          onMatchClick={handleMatchClick}
          svgWrapper={({ children, ...props }) => (
            <SVGViewer width={finalWidth} height={finalHeight} {...props}>
              {children}
            </SVGViewer>
          )}
        />
      ) : null}
    </div>
  );
};

export default GlootBracket;
