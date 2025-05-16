
import { PlayoffMatch } from "@/types";

/**
 * Get the vertical spacing between matches in a round based on round index
 */
export const getVerticalSpacing = (roundIndex: number): number => {
  // As we progress deeper in the bracket, space increases between matches
  const baseSpacing = 16; // Base spacing in pixels
  const spacingMultiplier = Math.pow(2, roundIndex);
  
  return baseSpacing * spacingMultiplier;
};

/**
 * Find the next match for a given match in the bracket
 */
export const getNextMatch = (match: PlayoffMatch, allMatches: PlayoffMatch[]): PlayoffMatch | null => {
  // Find the match that has this match as a prerequisite 
  // (handles both winners and losers paths in double elimination)
  
  for (const potentialNextMatch of allMatches) {
    if (potentialNextMatch.round > match.round) {
      // For normal progression in same bracket type
      if (potentialNextMatch.matchType === match.matchType) {
        // Check if positions align for next round
        // In a traditional bracket, match positions 1 and 2 feed into position 1 of the next round, etc.
        const shouldFeedIntoPosition = Math.ceil(match.position / 2);
        if (potentialNextMatch.position === shouldFeedIntoPosition) {
          return potentialNextMatch;
        }
      }
      
      // For losers bracket progression
      if (match.matchType === 'Winners' && potentialNextMatch.matchType === 'Losers') {
        // This requires specific bracket structure knowledge
        // Typically odd-positioned matches in winners bracket feed into specific losers bracket positions
        // This is a simplistic approach and may need refinement based on actual bracket structure
        return null;
      }
      
      // For finals (winners of winners and losers brackets)
      if ((match.matchType === 'Winners' || match.matchType === 'Losers') && 
          potentialNextMatch.matchType === 'Finals' && 
          match.position === 1) { // Usually position 1 is the final match of a bracket
        return potentialNextMatch;
      }
    }
  }
  
  return null;
};

/**
 * Generate SVG path data for bracket connectors
 */
export const getBracketConnectorPaths = (matches: PlayoffMatch[]): string[] => {
  const paths: string[] = [];
  const matchPositions: Record<string, DOMRect | null> = {};
  
  // Wait for DOM to be ready and get match element positions
  setTimeout(() => {
    document.querySelectorAll('[data-match-id]').forEach(element => {
      const matchId = element.getAttribute('data-match-id');
      if (matchId) {
        matchPositions[matchId] = element.getBoundingClientRect();
      }
    });
    
    // Now generate the paths based on these positions
    matches.forEach(match => {
      const nextMatch = getNextMatch(match, matches);
      if (nextMatch) {
        const currentRect = matchPositions[match.id];
        const nextRect = matchPositions[nextMatch.id];
        
        if (currentRect && nextRect) {
          // Calculate path coordinates
          const startX = currentRect.right;
          const startY = currentRect.top + (currentRect.height / 2);
          const endX = nextRect.left;
          const endY = nextRect.top + (nextRect.height / 2);
          
          // Create path
          const path = `M${startX},${startY} L${startX + (endX - startX) / 2},${startY} L${startX + (endX - startX) / 2},${endY} L${endX},${endY}`;
          paths.push(path);
        }
      }
    });
  }, 100);
  
  // For the initial render, return empty paths (they'll be populated after DOM is ready)
  return paths;
};

/**
 * Create a simpler version of SVG path data for bracket connectors
 * This is used for the initial render before DOM positions are known
 */
export const getSimpleBracketPaths = (matches: PlayoffMatch[]): string[] => {
  const paths: string[] = [];
  const roundsMap: Record<number, PlayoffMatch[]> = {};
  
  // Group matches by round
  matches.forEach(match => {
    if (!roundsMap[match.round]) {
      roundsMap[match.round] = [];
    }
    roundsMap[match.round].push(match);
  });
  
  // Sort rounds
  const rounds = Object.keys(roundsMap)
    .map(Number)
    .sort((a, b) => a - b);
  
  // For each round except the last, connect to the next round
  for (let i = 0; i < rounds.length - 1; i++) {
    const currentRound = rounds[i];
    const nextRound = rounds[i + 1];
    
    const currentMatches = roundsMap[currentRound].sort((a, b) => a.position - b.position);
    const nextMatches = roundsMap[nextRound].sort((a, b) => a.position - b.position);
    
    // Each pair of matches in the current round connects to one match in the next round
    for (let j = 0; j < currentMatches.length; j += 2) {
      const match1 = currentMatches[j];
      const match2 = j + 1 < currentMatches.length ? currentMatches[j + 1] : null;
      
      const nextMatchIndex = Math.floor(j / 2);
      if (nextMatchIndex < nextMatches.length) {
        const nextMatch = nextMatches[nextMatchIndex];
        
        // Define horizontal span and vertical placement
        const horizontalGap = 80; // Space between rounds
        const startX = (currentRound - 1) * horizontalGap + 64; // Width of match card
        const endX = startX + horizontalGap;
        
        const verticalGap = getVerticalSpacing(currentRound - 1);
        const startY1 = j * verticalGap + 20; // Vertical center of first match
        
        if (match2) {
          const startY2 = (j + 1) * verticalGap + 20; // Vertical center of second match
          const endY = (startY1 + startY2) / 2; // Midpoint between the two matches
          
          // Create path for first match
          paths.push(`M${startX},${startY1} H${startX + horizontalGap/2} V${endY} H${endX}`);
          
          // Create path for second match
          paths.push(`M${startX},${startY2} H${startX + horizontalGap/2} V${endY} H${endX}`);
        } else {
          // If only one match in the pair, create direct line
          paths.push(`M${startX},${startY1} H${endX}`);
        }
      }
    }
  }
  
  return paths;
};
