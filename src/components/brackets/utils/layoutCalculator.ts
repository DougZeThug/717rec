
import { ProcessedBracketData, BracketConnection, BracketTheme, BracketMatch } from "../types/bracketTypes";

export const calculateLayout = (
  data: ProcessedBracketData,
  theme: BracketTheme
): ProcessedBracketData => {
  const { matchWidth, matchHeight, columnGap, rowGap } = theme.spacing;
  
  // Calculate dynamic section positioning
  const winnersSection = data.sections.find(s => s.type === 'winners');
  const losersSection = data.sections.find(s => s.type === 'losers');
  const finalsSection = data.sections.find(s => s.type === 'finals');

  let winnersHeight = 0;
  let winnersWidth = 0;
  let losersHeight = 0;
  let losersWidth = 0;

  // Calculate Winners section layout with improved spacing
  if (winnersSection) {
    const winnersStartY = 80; // Header space
    calculateSectionLayout(winnersSection, 40, winnersStartY, theme);
    winnersWidth = winnersSection.rounds.length * (matchWidth + columnGap);
    winnersHeight = calculateSectionHeight(winnersSection, matchHeight, rowGap);
  }

  // Calculate Losers section layout with dynamic Y position
  if (losersSection) {
    const losersStartY = winnersHeight + 180; // Dynamic gap below winners
    calculateSectionLayout(losersSection, 40, losersStartY, theme);
    losersWidth = losersSection.rounds.length * (matchWidth + columnGap);
    losersHeight = calculateSectionHeight(losersSection, matchHeight, rowGap);
  }

  // Calculate Finals section layout - centered between brackets
  if (finalsSection) {
    const finalsX = Math.max(winnersWidth, losersWidth) + 100;
    const totalBracketHeight = winnersHeight + losersHeight + 180;
    const finalsY = (totalBracketHeight / 2) - (finalsSection.rounds.length * (matchHeight + 50) / 2);
    calculateFinalsSectionLayout(finalsSection, finalsX, Math.max(finalsY, 120), theme);
  }

  // Create match lookup map for relationship-based connections
  const matchLookup = createMatchLookupMap(data);

  // Calculate connections using actual database relationships
  const connections = calculateConnectionsUsingRelationships(data, matchLookup, theme);

  const totalWidth = Math.max(winnersWidth, losersWidth) + (finalsSection ? 200 : 0) + matchWidth;
  const totalHeight = Math.max(winnersHeight + losersHeight + 200, 650);

  return {
    ...data,
    connections,
    dimensions: {
      width: totalWidth,
      height: totalHeight
    }
  };
};

// Create a lookup map for all matches by ID
const createMatchLookupMap = (data: ProcessedBracketData): Map<string, BracketMatch> => {
  const matchLookup = new Map<string, BracketMatch>();
  
  data.sections.forEach(section => {
    section.rounds.forEach(round => {
      round.matches.forEach(match => {
        matchLookup.set(match.id, match);
      });
    });
  });
  
  return matchLookup;
};

// Calculate connections using actual database relationships instead of math
const calculateConnectionsUsingRelationships = (
  data: ProcessedBracketData, 
  matchLookup: Map<string, BracketMatch>, 
  theme: BracketTheme
): BracketConnection[] => {
  const connections: BracketConnection[] = [];
  const { matchWidth, matchHeight, columnGap } = theme.spacing;

  data.sections.forEach(section => {
    section.rounds.forEach(round => {
      round.matches.forEach(match => {
        // Create winners connections using nextWinMatchId
        if (match.nextWinMatchId) {
          const targetMatch = matchLookup.get(match.nextWinMatchId);
          if (targetMatch && match.position && targetMatch.position) {
            const connection = createConnection(
              match, 
              targetMatch, 
              'win', 
              matchWidth, 
              matchHeight, 
              columnGap
            );
            connections.push(connection);
          }
        }

        // Create losers connections using nextLoseMatchId (cross-bracket)
        if (match.nextLoseMatchId) {
          const targetMatch = matchLookup.get(match.nextLoseMatchId);
          if (targetMatch && match.position && targetMatch.position) {
            const connection = createConnection(
              match, 
              targetMatch, 
              'lose', 
              matchWidth, 
              matchHeight, 
              columnGap
            );
            connections.push(connection);
          }
        }
      });
    });
  });

  return connections;
};

// Create a connection between two matches
const createConnection = (
  fromMatch: BracketMatch,
  toMatch: BracketMatch,
  connectionType: 'win' | 'lose',
  matchWidth: number,
  matchHeight: number,
  columnGap: number
): BracketConnection => {
  const fromCenterX = fromMatch.position!.x + matchWidth;
  const fromCenterY = fromMatch.position!.y + (matchHeight / 2);
  const toCenterX = toMatch.position!.x;
  const toCenterY = toMatch.position!.y + (matchHeight / 2);

  // For cross-bracket connections (lose), create more complex paths
  const isCrossBracket = fromMatch.matchType !== toMatch.matchType;
  
  let path: string;
  let segments: any[];

  if (isCrossBracket) {
    // Complex path for cross-bracket connections
    const midX1 = fromCenterX + (columnGap * 0.3);
    const midX2 = toCenterX - (columnGap * 0.3);
    const midY = (fromCenterY + toCenterY) / 2;

    path = `M ${fromCenterX} ${fromCenterY} L ${midX1} ${fromCenterY} L ${midX1} ${midY} L ${midX2} ${midY} L ${midX2} ${toCenterY} L ${toCenterX} ${toCenterY}`;
    
    segments = [
      { type: 'horizontal', x1: fromCenterX, y1: fromCenterY, x2: midX1, y2: fromCenterY },
      { type: 'vertical', x1: midX1, y1: fromCenterY, x2: midX1, y2: midY },
      { type: 'horizontal', x1: midX1, y1: midY, x2: midX2, y2: midY },
      { type: 'vertical', x1: midX2, y1: midY, x2: midX2, y2: toCenterY },
      { type: 'horizontal', x1: midX2, y1: toCenterY, x2: toCenterX, y2: toCenterY }
    ];
  } else {
    // Simple L-shaped path for same-bracket connections
    const midX = fromCenterX + (columnGap / 2);
    path = `M ${fromCenterX} ${fromCenterY} L ${midX} ${fromCenterY} L ${midX} ${toCenterY} L ${toCenterX} ${toCenterY}`;
    
    segments = [
      { type: 'horizontal', x1: fromCenterX, y1: fromCenterY, x2: midX, y2: fromCenterY },
      { type: 'vertical', x1: midX, y1: fromCenterY, x2: midX, y2: toCenterY },
      { type: 'horizontal', x1: midX, y1: toCenterY, x2: toCenterX, y2: toCenterY }
    ];
  }

  return {
    id: `${fromMatch.id}-to-${toMatch.id}-${connectionType}`,
    fromMatch: fromMatch.id,
    toMatch: toMatch.id,
    path,
    type: toMatch.matchType, // Connection takes the type of the target section
    positioning: {
      path,
      segments,
      fromPoint: { x: fromCenterX, y: fromCenterY },
      toPoint: { x: toCenterX, y: toCenterY },
      midPoint: { x: (fromCenterX + toCenterX) / 2, y: (fromCenterY + toCenterY) / 2 },
      roundIndex: 0,
      matchIndex: 0,
      sectionType: `${fromMatch.matchType}-to-${toMatch.matchType}`
    }
  };
};

// Calculate the total height needed for a section
const calculateSectionHeight = (section: any, matchHeight: number, rowGap: number): number => {
  let maxHeight = 0;
  
  section.rounds.forEach((round: any, roundIndex: number) => {
    const roundHeight = calculateRoundHeight(round.matches.length, section.rounds.length, matchHeight, rowGap);
    maxHeight = Math.max(maxHeight, roundHeight);
  });
  
  return maxHeight + 100; // Add padding
};

// Calculate the height needed for a specific round with proportional spacing
const calculateRoundHeight = (matchCount: number, totalRounds: number, matchHeight: number, rowGap: number): number => {
  if (matchCount === 0) return 0;
  
  // Use proportional spacing instead of exponential growth
  const baseSpacing = rowGap;
  const spacingMultiplier = Math.max(1, (totalRounds - 1)); // Scale with total rounds
  const verticalSpacing = baseSpacing * spacingMultiplier;
  
  return (matchCount * matchHeight) + ((matchCount - 1) * verticalSpacing);
};

const calculateSectionLayout = (
  section: any,
  startX: number,
  startY: number,
  theme: BracketTheme
) => {
  const { matchWidth, matchHeight, columnGap, rowGap } = theme.spacing;
  
  section.rounds.forEach((round: any, roundIndex: number) => {
    const x = startX + (roundIndex * (matchWidth + columnGap));
    
    // Calculate proportional spacing for this round
    const totalMatches = round.matches.length;
    const verticalSpacing = calculateProportionalSpacing(roundIndex, section.rounds.length, rowGap);
    const totalRoundHeight = (totalMatches * matchHeight) + ((totalMatches - 1) * verticalSpacing);
    
    // Center the round vertically within the available space
    const roundStartY = startY;
    
    round.matches.forEach((match: any, matchIndex: number) => {
      const y = roundStartY + (matchIndex * (matchHeight + verticalSpacing));
      match.position = { x, y, width: matchWidth, height: matchHeight };
    });
    
    round.position = { x, y: roundStartY, width: matchWidth, height: totalRoundHeight };
  });
};

// Calculate proportional spacing based on round position and total rounds
const calculateProportionalSpacing = (roundIndex: number, totalRounds: number, baseSpacing: number): number => {
  if (totalRounds <= 1) return baseSpacing;
  
  // Create proportional spacing that increases with round index but doesn't explode
  const spacingFactor = 1 + (roundIndex * 1.5); // Gradual increase
  return Math.max(baseSpacing * spacingFactor, baseSpacing);
};

const calculateFinalsSectionLayout = (
  section: any,
  startX: number,
  startY: number,
  theme: BracketTheme
) => {
  const { matchWidth, matchHeight } = theme.spacing;
  
  section.rounds.forEach((round: any, roundIndex: number) => {
    round.matches.forEach((match: any, matchIndex: number) => {
      // Stack finals rounds vertically with proper spacing
      const y = startY + (roundIndex * (matchHeight + 60));
      match.position = { x: startX, y, width: matchWidth, height: matchHeight };
    });
    
    round.position = { 
      x: startX, 
      y: startY + (roundIndex * (matchHeight + 60)), 
      width: matchWidth, 
      height: matchHeight 
    };
  });
};
