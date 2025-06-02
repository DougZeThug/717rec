
import { ProcessedBracketData, BracketConnection, BracketTheme } from "../types/bracketTypes";

export const calculateLayout = (
  data: ProcessedBracketData,
  theme: BracketTheme
): ProcessedBracketData => {
  const { matchWidth, matchHeight, columnGap, rowGap } = theme.spacing;
  
  let winnersWidth = 0;
  const winnersY = 80;
  const losersY = 500;
  const finalsY = 200;

  // Calculate Winners section layout
  const winnersSection = data.sections.find(s => s.type === 'winners');
  if (winnersSection) {
    calculateWinnersSectionLayout(winnersSection, 0, winnersY, theme);
    winnersWidth = winnersSection.rounds.length * (matchWidth + columnGap);
  }

  // Calculate Losers section layout
  const losersSection = data.sections.find(s => s.type === 'losers');
  if (losersSection) {
    calculateLosersSectionLayout(losersSection, 0, losersY, theme);
  }

  // Calculate Finals section layout
  const finalsSection = data.sections.find(s => s.type === 'finals');
  if (finalsSection) {
    const finalsX = winnersWidth + columnGap;
    calculateFinalsSectionLayout(finalsSection, finalsX, finalsY, theme);
  }

  // Calculate connections with unified positioning logic
  const connections = calculateUnifiedConnections(data, theme);

  return {
    ...data,
    connections,
    dimensions: {
      width: Math.max(1200, winnersWidth + matchWidth + columnGap * 2),
      height: 700
    }
  };
};

const calculateWinnersSectionLayout = (
  section: any,
  startX: number,
  startY: number,
  theme: BracketTheme
) => {
  const { matchWidth, matchHeight, columnGap, rowGap } = theme.spacing;
  
  section.rounds.forEach((round: any, roundIndex: number) => {
    const x = startX + (roundIndex * (matchWidth + columnGap));
    
    round.matches.forEach((match: any, matchIndex: number) => {
      const y = calculateMatchY(startY, roundIndex, matchIndex, matchHeight, rowGap);
      match.position = { x, y, width: matchWidth, height: matchHeight };
    });
    
    round.position = { x, y: startY, width: matchWidth, height: 0 };
  });
};

const calculateLosersSectionLayout = (
  section: any,
  startX: number,
  startY: number,
  theme: BracketTheme
) => {
  const { matchWidth, matchHeight, columnGap, rowGap } = theme.spacing;
  
  section.rounds.forEach((round: any, roundIndex: number) => {
    const x = startX + (roundIndex * (matchWidth + columnGap));
    
    round.matches.forEach((match: any, matchIndex: number) => {
      const y = calculateMatchY(startY, roundIndex, matchIndex, matchHeight, rowGap);
      match.position = { x, y, width: matchWidth, height: matchHeight };
    });
    
    round.position = { x, y: startY, width: matchWidth, height: 0 };
  });
};

const calculateFinalsSectionLayout = (
  section: any,
  startX: number,
  startY: number,
  theme: BracketTheme
) => {
  const { matchWidth, matchHeight } = theme.spacing;
  
  section.rounds.forEach((round: any, index: number) => {
    round.matches.forEach((match: any, matchIndex: number) => {
      const y = startY + (matchIndex * (matchHeight + 40));
      match.position = { x: startX, y, width: matchWidth, height: matchHeight };
    });
    
    round.position = { x: startX, y: startY, width: matchWidth, height: matchHeight };
  });
};

// Unified function for calculating match Y positions
const calculateMatchY = (
  baseY: number,
  roundIndex: number,
  matchIndex: number,
  matchHeight: number,
  rowGap: number
): number => {
  if (roundIndex === 0) {
    // First round: standard spacing
    return baseY + (matchIndex * (matchHeight + rowGap));
  } else {
    // Later rounds: exponential spacing to center between previous round matches
    const verticalSpacing = (matchHeight + rowGap) * Math.pow(2, roundIndex);
    const targetY = baseY + (matchIndex * verticalSpacing) + (matchHeight / 2) + (verticalSpacing / 4);
    return targetY - (matchHeight / 2);
  }
};

// Unified connector calculation that uses the same positioning logic as matches
const calculateUnifiedConnections = (data: ProcessedBracketData, theme: BracketTheme): BracketConnection[] => {
  const connections: BracketConnection[] = [];
  const { matchWidth, matchHeight, columnGap, rowGap } = theme.spacing;
  
  data.sections.forEach(section => {
    section.rounds.forEach((round, roundIndex) => {
      if (roundIndex < section.rounds.length - 1) {
        const nextRound = section.rounds[roundIndex + 1];
        
        round.matches.forEach((match, matchIndex) => {
          const nextMatchIndex = Math.floor(matchIndex / 2);
          const nextMatch = nextRound.matches[nextMatchIndex];
          
          if (nextMatch && match.position && nextMatch.position) {
            // Calculate exact center points using the same logic as match positioning
            const fromCenterX = match.position.x + matchWidth;
            const fromCenterY = match.position.y + (matchHeight / 2);
            const toCenterX = nextMatch.position.x;
            const toCenterY = nextMatch.position.y + (matchHeight / 2);
            
            // Create connector with precise positioning
            const connectorData = createConnectorData(
              fromCenterX,
              fromCenterY,
              toCenterX,
              toCenterY,
              columnGap,
              roundIndex,
              matchIndex,
              section.type
            );
            
            connections.push({
              id: `${match.id}-to-${nextMatch.id}`,
              fromMatch: match.id,
              toMatch: nextMatch.id,
              path: connectorData.path,
              type: section.type,
              // Store detailed positioning data for rendering
              positioning: connectorData
            });
          }
        });
      }
    });
  });

  // Add connection from winners final to grand final with unified positioning
  const winnersSection = data.sections.find(s => s.type === 'winners');
  const finalsSection = data.sections.find(s => s.type === 'finals');
  
  if (winnersSection && finalsSection && winnersSection.rounds.length > 0 && finalsSection.rounds.length > 0) {
    const winnersFinal = winnersSection.rounds[winnersSection.rounds.length - 1].matches[0];
    const grandFinal = finalsSection.rounds[0].matches[0];
    
    if (winnersFinal && grandFinal && winnersFinal.position && grandFinal.position) {
      const fromCenterX = winnersFinal.position.x + matchWidth;
      const fromCenterY = winnersFinal.position.y + (matchHeight / 2);
      const toCenterX = grandFinal.position.x;
      const toCenterY = grandFinal.position.y + (matchHeight / 2);
      
      const connectorData = createConnectorData(
        fromCenterX,
        fromCenterY,
        toCenterX,
        toCenterY,
        columnGap,
        0,
        0,
        'finals'
      );
      
      connections.push({
        id: `${winnersFinal.id}-to-grand-final`,
        fromMatch: winnersFinal.id,
        toMatch: grandFinal.id,
        path: connectorData.path,
        type: 'finals',
        positioning: connectorData
      });
    }
  }
  
  return connections;
};

// Create detailed connector data with precise positioning
const createConnectorData = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  columnGap: number,
  roundIndex: number,
  matchIndex: number,
  sectionType: string
) => {
  const midX = fromX + (columnGap / 2);
  
  return {
    path: `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`,
    segments: [
      {
        type: 'horizontal',
        x1: fromX,
        y1: fromY,
        x2: midX,
        y2: fromY,
        isFirstSegment: true
      },
      {
        type: 'vertical',
        x1: midX,
        y1: fromY,
        x2: midX,
        y2: toY,
        isConnector: true
      },
      {
        type: 'horizontal',
        x1: midX,
        y1: toY,
        x2: toX,
        y2: toY,
        isLastSegment: true
      }
    ],
    fromPoint: { x: fromX, y: fromY },
    toPoint: { x: toX, y: toY },
    midPoint: { x: midX, y: (fromY + toY) / 2 },
    roundIndex,
    matchIndex,
    sectionType
  };
};
