
import { ProcessedBracketData, BracketConnection, BracketTheme, BracketMatch } from "../types/bracketTypes";

export const calculateLayout = (
  data: ProcessedBracketData,
  theme: BracketTheme
): ProcessedBracketData => {
  const { matchWidth, matchHeight, columnGap, rowGap } = theme.spacing;
  
  // Find sections
  const winnersSection = data.sections.find(s => s.type === 'winners');
  const losersSection = data.sections.find(s => s.type === 'losers');
  const finalsSection = data.sections.find(s => s.type === 'finals');

  let winnersHeight = 0;
  let winnersWidth = 0;
  let losersHeight = 0;
  let losersWidth = 0;

  // Calculate Winners section layout with simple spacing
  if (winnersSection) {
    const winnersStartY = 80; // Fixed header space
    calculateSimpleSectionLayout(winnersSection, 40, winnersStartY, theme);
    winnersWidth = winnersSection.rounds.length * (matchWidth + columnGap);
    winnersHeight = calculateSectionHeight(winnersSection, matchHeight, rowGap);
  }

  // Calculate Losers section layout with fixed gap
  if (losersSection) {
    const SECTION_GAP = 200; // Fixed gap between sections
    const losersStartY = winnersHeight + SECTION_GAP;
    calculateSimpleSectionLayout(losersSection, 40, losersStartY, theme);
    losersWidth = losersSection.rounds.length * (matchWidth + columnGap);
    losersHeight = calculateSectionHeight(losersSection, matchHeight, rowGap);
  }

  // Calculate Finals section layout - fixed positioning
  if (finalsSection) {
    const FINALS_X_POSITION = 800; // Fixed X position for finals
    const totalBracketHeight = winnersHeight + losersHeight + 200;
    const finalsY = totalBracketHeight / 2 - 40; // Center vertically
    calculateFinalsSectionLayout(finalsSection, FINALS_X_POSITION, finalsY, theme);
  }

  // Create match lookup map for connections
  const matchLookup = createMatchLookupMap(data);

  // Calculate simple connections
  const connections = calculateSimpleConnections(data, matchLookup, theme);

  const totalWidth = Math.max(winnersWidth, losersWidth) + 400; // Fixed extra space for finals
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

// Simplified section layout with exponential spacing
const calculateSimpleSectionLayout = (
  section: any,
  startX: number,
  startY: number,
  theme: BracketTheme
) => {
  const { matchWidth, matchHeight, columnGap, rowGap } = theme.spacing;
  
  section.rounds.forEach((round: any, roundIndex: number) => {
    const x = startX + (roundIndex * (matchWidth + columnGap));
    
    // Simple exponential spacing: more space in later rounds
    const spacing = rowGap * Math.pow(2, roundIndex);
    
    round.matches.forEach((match: any, matchIndex: number) => {
      const y = startY + (matchIndex * (matchHeight + spacing));
      match.position = { x, y, width: matchWidth, height: matchHeight };
    });
    
    round.position = { x, y: startY, width: matchWidth, height: matchHeight * round.matches.length };
  });
};

// Simple match lookup creation
const createMatchLookupMap = (data: ProcessedBracketData): Map<string, BracketMatch> => {
  const matchLookup = new Map<string, BracketMatch>();
  
  data.sections.forEach(section => {
    section.rounds.forEach(round => {
      round.matches.forEach(match => {
        if (match.id) {
          matchLookup.set(match.id, match);
        }
      });
    });
  });
  
  return matchLookup;
};

// Simplified connection calculation with L-shaped connectors
const calculateSimpleConnections = (
  data: ProcessedBracketData, 
  matchLookup: Map<string, BracketMatch>, 
  theme: BracketTheme
): BracketConnection[] => {
  const connections: BracketConnection[] = [];
  const { matchWidth, matchHeight, columnGap } = theme.spacing;

  data.sections.forEach(section => {
    section.rounds.forEach(round => {
      round.matches.forEach(match => {
        // Create winner connections using nextWinMatchId
        if (match.nextWinMatchId) {
          const targetMatch = matchLookup.get(match.nextWinMatchId);
          if (targetMatch && match.position && targetMatch.position) {
            const connection = createSimpleConnection(
              match, 
              targetMatch, 
              matchWidth, 
              matchHeight, 
              columnGap
            );
            connections.push(connection);
          }
        }

        // Create loser connections using nextLoseMatchId
        if (match.nextLoseMatchId) {
          const targetMatch = matchLookup.get(match.nextLoseMatchId);
          if (targetMatch && match.position && targetMatch.position) {
            const connection = createSimpleConnection(
              match, 
              targetMatch, 
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

// Simple L-shaped connection creation
const createSimpleConnection = (
  fromMatch: BracketMatch,
  toMatch: BracketMatch,
  matchWidth: number,
  matchHeight: number,
  columnGap: number
): BracketConnection => {
  if (!fromMatch.position || !toMatch.position) {
    // Simple fallback connection
    return {
      id: `fallback-${fromMatch.id}-to-${toMatch.id}`,
      fromMatch: fromMatch.id,
      toMatch: toMatch.id,
      path: '',
      type: toMatch.matchType,
      positioning: {
        path: '',
        segments: [],
        fromPoint: { x: 0, y: 0 },
        toPoint: { x: 0, y: 0 },
        midPoint: { x: 0, y: 0 },
        roundIndex: 0,
        matchIndex: 0,
        sectionType: 'fallback'
      }
    };
  }

  const fromCenterX = fromMatch.position.x + matchWidth;
  const fromCenterY = fromMatch.position.y + (matchHeight / 2);
  const toCenterX = toMatch.position.x;
  const toCenterY = toMatch.position.y + (matchHeight / 2);

  // Simple L-shaped path: horizontal then vertical
  const midX = fromCenterX + (columnGap / 2);
  const path = `M ${fromCenterX} ${fromCenterY} L ${midX} ${fromCenterY} L ${midX} ${toCenterY} L ${toCenterX} ${toCenterY}`;
  
  const segments = [
    { type: 'horizontal', x1: fromCenterX, y1: fromCenterY, x2: midX, y2: fromCenterY },
    { type: 'vertical', x1: midX, y1: fromCenterY, x2: midX, y2: toCenterY },
    { type: 'horizontal', x1: midX, y1: toCenterY, x2: toCenterX, y2: toCenterY }
  ];

  return {
    id: `${fromMatch.id}-to-${toMatch.id}`,
    fromMatch: fromMatch.id,
    toMatch: toMatch.id,
    path,
    type: toMatch.matchType,
    positioning: {
      path,
      segments,
      fromPoint: { x: fromCenterX, y: fromCenterY },
      toPoint: { x: toCenterX, y: toCenterY },
      midPoint: { x: midX, y: (fromCenterY + toCenterY) / 2 },
      roundIndex: 0,
      matchIndex: 0,
      sectionType: fromMatch.matchType
    }
  };
};

// Simple section height calculation
const calculateSectionHeight = (section: any, matchHeight: number, rowGap: number): number => {
  if (!section || !section.rounds || section.rounds.length === 0) {
    return 100;
  }
  
  let maxHeight = 0;
  
  section.rounds.forEach((round: any, roundIndex: number) => {
    if (round.matches && round.matches.length > 0) {
      const spacing = rowGap * Math.pow(2, roundIndex);
      const roundHeight = (round.matches.length * matchHeight) + ((round.matches.length - 1) * spacing);
      maxHeight = Math.max(maxHeight, roundHeight);
    }
  });
  
  return maxHeight + 100; // Add padding
};

// Simple finals section layout
const calculateFinalsSectionLayout = (
  section: any,
  startX: number,
  startY: number,
  theme: BracketTheme
) => {
  const { matchWidth, matchHeight } = theme.spacing;
  
  section.rounds.forEach((round: any, roundIndex: number) => {
    round.matches.forEach((match: any, matchIndex: number) => {
      const y = startY + (roundIndex * (matchHeight + 60)); // Fixed spacing for finals
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
