
import { ProcessedBracketData, BracketConnection, BracketTheme, BracketMatch } from "../types/bracketTypes";

export const calculateLayout = (
  data: ProcessedBracketData,
  theme: BracketTheme
): ProcessedBracketData => {
  const { matchWidth, matchHeight, columnGap, rowGap } = theme.spacing;
  
  // Calculate dynamic section positioning with improved spacing
  const winnersSection = data.sections.find(s => s.type === 'winners');
  const losersSection = data.sections.find(s => s.type === 'losers');
  const finalsSection = data.sections.find(s => s.type === 'finals');

  let winnersHeight = 0;
  let winnersWidth = 0;
  let losersHeight = 0;
  let losersWidth = 0;

  // Calculate Winners section layout with dynamic spacing
  if (winnersSection) {
    const winnersStartY = 80; // Header space
    calculateSectionLayoutWithDynamicSpacing(winnersSection, 40, winnersStartY, theme);
    winnersWidth = winnersSection.rounds.length * (matchWidth + columnGap);
    winnersHeight = calculateSectionHeight(winnersSection, matchHeight, rowGap);
  }

  // Calculate Losers section layout with dynamic Y position and proper spacing
  if (losersSection) {
    const sectionGap = calculateOptimalSectionGap(winnersSection, losersSection, theme);
    const losersStartY = winnersHeight + sectionGap;
    calculateSectionLayoutWithDynamicSpacing(losersSection, 40, losersStartY, theme);
    losersWidth = losersSection.rounds.length * (matchWidth + columnGap);
    losersHeight = calculateSectionHeight(losersSection, matchHeight, rowGap);
  }

  // Calculate Finals section layout - centered between brackets with optimal positioning
  if (finalsSection) {
    const finalsX = Math.max(winnersWidth, losersWidth) + 100;
    const totalBracketHeight = winnersHeight + losersHeight + (losersSection ? 180 : 0);
    const finalsY = calculateOptimalFinalsPosition(totalBracketHeight, finalsSection, theme);
    calculateFinalsSectionLayout(finalsSection, finalsX, finalsY, theme);
  }

  // Create match lookup map for relationship-based connections with error handling
  const matchLookup = createMatchLookupMapWithValidation(data);

  // Calculate connections using actual database relationships with robust error handling
  const connections = calculateConnectionsWithErrorHandling(data, matchLookup, theme);

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

// Enhanced match lookup with validation and error handling
const createMatchLookupMapWithValidation = (data: ProcessedBracketData): Map<string, BracketMatch> => {
  const matchLookup = new Map<string, BracketMatch>();
  
  try {
    data.sections.forEach(section => {
      section.rounds.forEach(round => {
        round.matches.forEach(match => {
          if (match.id) {
            matchLookup.set(match.id, match);
          } else {
            console.warn('Match found without ID:', match);
          }
        });
      });
    });
    
    console.log('Match lookup created successfully:', {
      totalMatches: matchLookup.size,
      sections: data.sections.map(s => ({ type: s.type, rounds: s.rounds.length }))
    });
  } catch (error) {
    console.error('Error creating match lookup map:', error);
  }
  
  return matchLookup;
};

// Enhanced connection calculation with comprehensive error handling
const calculateConnectionsWithErrorHandling = (
  data: ProcessedBracketData, 
  matchLookup: Map<string, BracketMatch>, 
  theme: BracketTheme
): BracketConnection[] => {
  const connections: BracketConnection[] = [];
  const { matchWidth, matchHeight, columnGap } = theme.spacing;
  let successfulConnections = 0;
  let failedConnections = 0;

  try {
    data.sections.forEach(section => {
      section.rounds.forEach(round => {
        round.matches.forEach(match => {
          // Create winners connections using nextWinMatchId with error handling
          if (match.nextWinMatchId) {
            try {
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
                successfulConnections++;
              } else {
                console.warn('Failed to create win connection:', {
                  fromMatchId: match.id,
                  nextWinMatchId: match.nextWinMatchId,
                  targetFound: !!targetMatch,
                  fromPosition: !!match.position,
                  targetPosition: targetMatch ? !!targetMatch.position : false
                });
                failedConnections++;
              }
            } catch (error) {
              console.error('Error creating win connection for match:', match.id, error);
              failedConnections++;
            }
          }

          // Create losers connections using nextLoseMatchId with error handling
          if (match.nextLoseMatchId) {
            try {
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
                successfulConnections++;
              } else {
                console.warn('Failed to create lose connection:', {
                  fromMatchId: match.id,
                  nextLoseMatchId: match.nextLoseMatchId,
                  targetFound: !!targetMatch,
                  fromPosition: !!match.position,
                  targetPosition: targetMatch ? !!targetMatch.position : false
                });
                failedConnections++;
              }
            } catch (error) {
              console.error('Error creating lose connection for match:', match.id, error);
              failedConnections++;
            }
          }
        });
      });
    });

    console.log('Connection calculation completed:', {
      successfulConnections,
      failedConnections,
      totalConnections: connections.length
    });
  } catch (error) {
    console.error('Critical error in connection calculation:', error);
  }

  return connections;
};

// Enhanced connection creation with fallback logic
const createConnection = (
  fromMatch: BracketMatch,
  toMatch: BracketMatch,
  connectionType: 'win' | 'lose',
  matchWidth: number,
  matchHeight: number,
  columnGap: number
): BracketConnection => {
  try {
    if (!fromMatch.position || !toMatch.position) {
      throw new Error('Missing position data for connection');
    }

    const fromCenterX = fromMatch.position.x + matchWidth;
    const fromCenterY = fromMatch.position.y + (matchHeight / 2);
    const toCenterX = toMatch.position.x;
    const toCenterY = toMatch.position.y + (matchHeight / 2);

    // Determine if this is a cross-bracket connection
    const isCrossBracket = fromMatch.matchType !== toMatch.matchType;
    
    let path: string;
    let segments: any[];

    if (isCrossBracket) {
      // Enhanced cross-bracket connection path with better routing
      const midX1 = fromCenterX + (columnGap * 0.4);
      const midX2 = toCenterX - (columnGap * 0.4);
      const controlY = calculateOptimalCrossPath(fromCenterY, toCenterY);

      path = `M ${fromCenterX} ${fromCenterY} L ${midX1} ${fromCenterY} L ${midX1} ${controlY} L ${midX2} ${controlY} L ${midX2} ${toCenterY} L ${toCenterX} ${toCenterY}`;
      
      segments = [
        { type: 'horizontal', x1: fromCenterX, y1: fromCenterY, x2: midX1, y2: fromCenterY },
        { type: 'vertical', x1: midX1, y1: fromCenterY, x2: midX1, y2: controlY },
        { type: 'horizontal', x1: midX1, y1: controlY, x2: midX2, y2: controlY },
        { type: 'vertical', x1: midX2, y1: controlY, x2: midX2, y2: toCenterY },
        { type: 'horizontal', x1: midX2, y1: toCenterY, x2: toCenterX, y2: toCenterY }
      ];
    } else {
      // Optimized same-bracket connection path
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
      type: toMatch.matchType,
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
  } catch (error) {
    console.error('Error creating connection:', error, { fromMatch: fromMatch.id, toMatch: toMatch.id });
    // Return a minimal fallback connection
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
};

// Dynamic spacing calculation based on available space and total rounds
const calculateSectionLayoutWithDynamicSpacing = (
  section: any,
  startX: number,
  startY: number,
  theme: BracketTheme
) => {
  const { matchWidth, matchHeight, columnGap, rowGap } = theme.spacing;
  
  try {
    // Calculate optimal spacing based on section characteristics
    const totalRounds = section.rounds.length;
    const maxMatchesInRound = Math.max(...section.rounds.map((r: any) => r.matches.length));
    
    section.rounds.forEach((round: any, roundIndex: number) => {
      const x = startX + (roundIndex * (matchWidth + columnGap));
      
      // Dynamic spacing calculation
      const optimalSpacing = calculateOptimalSpacing(
        round.matches.length,
        maxMatchesInRound,
        totalRounds,
        roundIndex,
        rowGap
      );
      
      const totalRoundHeight = (round.matches.length * matchHeight) + ((round.matches.length - 1) * optimalSpacing);
      const roundStartY = startY + Math.max(0, (maxMatchesInRound * matchHeight - totalRoundHeight) / 2);
      
      round.matches.forEach((match: any, matchIndex: number) => {
        const y = roundStartY + (matchIndex * (matchHeight + optimalSpacing));
        match.position = { x, y, width: matchWidth, height: matchHeight };
      });
      
      round.position = { x, y: roundStartY, width: matchWidth, height: totalRoundHeight };
    });
  } catch (error) {
    console.error('Error in section layout calculation:', error);
    // Fallback to simple layout
    section.rounds.forEach((round: any, roundIndex: number) => {
      const x = startX + (roundIndex * (matchWidth + columnGap));
      round.matches.forEach((match: any, matchIndex: number) => {
        const y = startY + (matchIndex * (matchHeight + rowGap));
        match.position = { x, y, width: matchWidth, height: matchHeight };
      });
    });
  }
};

// Calculate optimal spacing between matches based on context
const calculateOptimalSpacing = (
  matchCount: number,
  maxMatches: number,
  totalRounds: number,
  roundIndex: number,
  baseSpacing: number
): number => {
  if (matchCount <= 1) return baseSpacing;
  
  // Progressive spacing: later rounds get more space between fewer matches
  const progressiveFactor = 1 + (roundIndex * 0.5);
  const densityFactor = Math.max(0.5, 1 - (matchCount / maxMatches) * 0.3);
  
  return Math.max(baseSpacing, baseSpacing * progressiveFactor * densityFactor);
};

// Calculate optimal gap between sections based on content
const calculateOptimalSectionGap = (
  winnersSection: any,
  losersSection: any,
  theme: BracketTheme
): number => {
  const baseGap = 180;
  
  if (!winnersSection || !losersSection) return baseGap;
  
  // Adjust gap based on section sizes
  const winnersComplexity = winnersSection.rounds.length * Math.max(...winnersSection.rounds.map((r: any) => r.matches.length));
  const losersComplexity = losersSection.rounds.length * Math.max(...losersSection.rounds.map((r: any) => r.matches.length));
  
  const complexityFactor = Math.min(2, (winnersComplexity + losersComplexity) / 20);
  
  return Math.max(baseGap, baseGap * complexityFactor);
};

// Calculate optimal finals position for visual balance
const calculateOptimalFinalsPosition = (
  totalBracketHeight: number,
  finalsSection: any,
  theme: BracketTheme
): number => {
  const { matchHeight } = theme.spacing;
  
  if (!finalsSection || finalsSection.rounds.length === 0) {
    return Math.max(120, totalBracketHeight / 3);
  }
  
  const finalsHeight = finalsSection.rounds.length * (matchHeight + 60);
  const centerPosition = (totalBracketHeight - finalsHeight) / 2;
  
  return Math.max(120, centerPosition);
};

// Calculate optimal path for cross-bracket connections
const calculateOptimalCrossPath = (fromY: number, toY: number): number => {
  // Create a smooth transition path between brackets
  return fromY + ((toY - fromY) * 0.6);
};

// Enhanced section height calculation with error handling
const calculateSectionHeight = (section: any, matchHeight: number, rowGap: number): number => {
  try {
    if (!section || !section.rounds || section.rounds.length === 0) {
      return 100; // Minimum height
    }
    
    let maxHeight = 0;
    
    section.rounds.forEach((round: any) => {
      if (round.matches && round.matches.length > 0) {
        const roundHeight = calculateRoundHeight(round.matches.length, section.rounds.length, matchHeight, rowGap);
        maxHeight = Math.max(maxHeight, roundHeight);
      }
    });
    
    return maxHeight + 100; // Add padding
  } catch (error) {
    console.error('Error calculating section height:', error);
    return 300; // Fallback height
  }
};

// Enhanced round height calculation
const calculateRoundHeight = (matchCount: number, totalRounds: number, matchHeight: number, rowGap: number): number => {
  if (matchCount === 0) return 0;
  
  // Use dynamic spacing instead of exponential growth
  const optimalSpacing = calculateOptimalSpacing(matchCount, matchCount, totalRounds, 0, rowGap);
  
  return (matchCount * matchHeight) + ((matchCount - 1) * optimalSpacing);
};

// Enhanced finals section layout
const calculateFinalsSectionLayout = (
  section: any,
  startX: number,
  startY: number,
  theme: BracketTheme
) => {
  const { matchWidth, matchHeight } = theme.spacing;
  
  try {
    section.rounds.forEach((round: any, roundIndex: number) => {
      round.matches.forEach((match: any, matchIndex: number) => {
        // Improved finals stacking with better spacing
        const y = startY + (roundIndex * (matchHeight + 80)); // Increased spacing for finals
        match.position = { x: startX, y, width: matchWidth, height: matchHeight };
      });
      
      round.position = { 
        x: startX, 
        y: startY + (roundIndex * (matchHeight + 80)), 
        width: matchWidth, 
        height: matchHeight 
      };
    });
  } catch (error) {
    console.error('Error in finals layout calculation:', error);
    // Fallback layout
    section.rounds.forEach((round: any, roundIndex: number) => {
      round.matches.forEach((match: any, matchIndex: number) => {
        const y = startY + (roundIndex * (matchHeight + 60));
        match.position = { x: startX, y, width: matchWidth, height: matchHeight };
      });
    });
  }
};
