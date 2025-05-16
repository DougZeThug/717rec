
import { PlayoffMatch } from "@/types";

/**
 * Calculate vertical spacing between matches based on round
 */
export const getVerticalSpacing = (roundIndex: number): number => {
  // We want more space in earlier rounds and less in later rounds
  const baseSpacing = 120; // Base spacing for final matches
  const multiplier = Math.pow(1.5, roundIndex); // Exponential spacing

  return baseSpacing * multiplier;
};

/**
 * Get the next match in the bracket for a given match
 */
export const getNextMatch = (match: PlayoffMatch, allMatches: PlayoffMatch[]): PlayoffMatch | null => {
  // If we have explicit win match linking
  if (match.nextWinMatchId) {
    return allMatches.find(m => m.id === match.nextWinMatchId) || null;
  }
  
  // Legacy calculation (for backward compatibility)
  const nextRound = match.round + 1;
  const nextPosition = Math.ceil(match.position / 2);
  
  return allMatches.find(
    m => m.round === nextRound && 
         m.position === nextPosition && 
         m.matchType === match.matchType
  ) || null;
};

/**
 * Get the loser's next match in the bracket (for double elimination)
 */
export const getLoserNextMatch = (match: PlayoffMatch, allMatches: PlayoffMatch[]): PlayoffMatch | null => {
  // If we have explicit lose match linking
  if (match.nextLoseMatchId) {
    return allMatches.find(m => m.id === match.nextLoseMatchId) || null;
  }
  
  // For backward compatibility, return null
  return null;
};

/**
 * Calculate SVG paths for bracket connectors
 */
export const getBracketConnectorPaths = (matches: PlayoffMatch[]): string[] => {
  const paths: string[] = [];
  
  // Group matches by round and type for easier access
  const matchesByRoundAndType: Record<string, PlayoffMatch[]> = {};
  matches.forEach(match => {
    const key = `${match.round}-${match.matchType}`;
    if (!matchesByRoundAndType[key]) {
      matchesByRoundAndType[key] = [];
    }
    matchesByRoundAndType[key].push(match);
  });
  
  // Function to get match element position by id
  const getMatchElement = (matchId: string): HTMLElement | null => {
    return document.querySelector(`[data-match-id="${matchId}"]`);
  };
  
  // Process each match
  matches.forEach(match => {
    const matchElement = getMatchElement(match.id);
    if (!matchElement) return;
    
    // Connect to next win match
    const nextMatch = getNextMatch(match, matches);
    if (nextMatch) {
      const nextMatchElement = getMatchElement(nextMatch.id);
      if (nextMatchElement) {
        const path = createConnectorPath(matchElement, nextMatchElement, "right");
        if (path) paths.push(path);
      }
    }
    
    // Connect to next loser match (only in winners bracket)
    if (match.matchType === "winners") {
      const loserMatch = getLoserNextMatch(match, matches);
      if (loserMatch) {
        const loserMatchElement = getMatchElement(loserMatch.id);
        if (loserMatchElement) {
          const path = createConnectorPath(matchElement, loserMatchElement, "bottom");
          if (path) paths.push(path);
        }
      }
    }
  });
  
  return paths;
};

/**
 * Create an SVG path between two bracket elements
 */
const createConnectorPath = (
  fromElement: HTMLElement, 
  toElement: HTMLElement,
  direction: "right" | "bottom"
): string | null => {
  if (!fromElement || !toElement) return null;
  
  const fromRect = fromElement.getBoundingClientRect();
  const toRect = toElement.getBoundingClientRect();
  
  // Get positions relative to the SVG container
  const svgContainer = fromElement.closest("div")?.parentElement;
  if (!svgContainer) return null;
  
  const svgRect = svgContainer.getBoundingClientRect();
  
  // Calculate start and end points
  let startX = (fromRect.left + fromRect.right) / 2 - svgRect.left;
  let startY = (fromRect.top + fromRect.bottom) / 2 - svgRect.top;
  let endX = (toRect.left + toRect.right) / 2 - svgRect.left;
  let endY = (toRect.top + toRect.bottom) / 2 - svgRect.top;
  
  if (direction === "right") {
    // Right-to-left connection (standard for brackets)
    startX = fromRect.right - svgRect.left;
    endX = toRect.left - svgRect.left;
    
    const controlX = (startX + endX) / 2;
    
    // Create a bezier curve
    return `M${startX},${startY} C${controlX},${startY} ${controlX},${endY} ${endX},${endY}`;
  } else {
    // Bottom-to-top connection (for losers bracket)
    startY = fromRect.bottom - svgRect.top;
    endY = toRect.top - svgRect.top;
    
    // Create a path with a right angle
    return `M${startX},${startY} L${startX},${(startY + endY) / 2} L${endX},${(startY + endY) / 2} L${endX},${endY}`;
  }
};
