
import { ProcessedBracketData, BracketConnection, BracketTheme } from "../types/bracketTypes";

export const calculateLayout = (
  data: ProcessedBracketData,
  theme: BracketTheme
): ProcessedBracketData => {
  const { matchWidth, matchHeight, columnGap, rowGap } = theme.spacing;
  
  // Challonge-style horizontal layout positioning
  const winnersY = 60;
  const losersY = 400;
  const finalsX = 800; // Position finals to the right
  const finalsY = 180; // Center finals between winners and losers

  let winnersWidth = 0;
  let losersWidth = 0;

  // Calculate Winners section layout (top row, flows left to right)
  const winnersSection = data.sections.find(s => s.type === 'winners');
  if (winnersSection) {
    calculateHorizontalSectionLayout(winnersSection, 40, winnersY, theme);
    winnersWidth = winnersSection.rounds.length * (matchWidth + columnGap);
  }

  // Calculate Losers section layout (bottom row, flows left to right)
  const losersSection = data.sections.find(s => s.type === 'losers');
  if (losersSection) {
    calculateHorizontalSectionLayout(losersSection, 40, losersY, theme);
    losersWidth = losersSection.rounds.length * (matchWidth + columnGap);
  }

  // Calculate Finals section layout (positioned to the right)
  const finalsSection = data.sections.find(s => s.type === 'finals');
  if (finalsSection) {
    calculateFinalsSectionLayout(finalsSection, finalsX, finalsY, theme);
  }

  // Calculate connections ONLY within each bracket section (no cross-bracket connectors)
  const connections = calculateInternalConnections(data, theme);

  const totalWidth = Math.max(winnersWidth, losersWidth, finalsX + matchWidth + 100);

  return {
    ...data,
    connections,
    dimensions: {
      width: totalWidth,
      height: 650
    }
  };
};

const calculateHorizontalSectionLayout = (
  section: any,
  startX: number,
  startY: number,
  theme: BracketTheme
) => {
  const { matchWidth, matchHeight, columnGap, rowGap } = theme.spacing;
  
  section.rounds.forEach((round: any, roundIndex: number) => {
    const x = startX + (roundIndex * (matchWidth + columnGap));
    
    round.matches.forEach((match: any, matchIndex: number) => {
      const y = calculateHorizontalMatchY(startY, roundIndex, matchIndex, matchHeight, rowGap);
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
  
  section.rounds.forEach((round: any, roundIndex: number) => {
    round.matches.forEach((match: any, matchIndex: number) => {
      // Stack finals rounds vertically with spacing
      const y = startY + (roundIndex * (matchHeight + 50));
      match.position = { x: startX, y, width: matchWidth, height: matchHeight };
    });
    
    round.position = { x: startX, y: startY + (roundIndex * (matchHeight + 50)), width: matchWidth, height: matchHeight };
  });
};

// Calculate match Y positions for horizontal flow
const calculateHorizontalMatchY = (
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

// Calculate connections ONLY within each bracket section
const calculateInternalConnections = (data: ProcessedBracketData, theme: BracketTheme): BracketConnection[] => {
  const connections: BracketConnection[] = [];
  const { matchWidth, matchHeight, columnGap } = theme.spacing;
  
  data.sections.forEach(section => {
    // Only create connectors within each section, not between sections
    section.rounds.forEach((round, roundIndex) => {
      if (roundIndex < section.rounds.length - 1) {
        const nextRound = section.rounds[roundIndex + 1];
        
        round.matches.forEach((match, matchIndex) => {
          const nextMatchIndex = Math.floor(matchIndex / 2);
          const nextMatch = nextRound.matches[nextMatchIndex];
          
          if (nextMatch && match.position && nextMatch.position) {
            const fromCenterX = match.position.x + matchWidth;
            const fromCenterY = match.position.y + (matchHeight / 2);
            const toCenterX = nextMatch.position.x;
            const toCenterY = nextMatch.position.y + (matchHeight / 2);
            
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
              positioning: connectorData
            });
          }
        });
      }
    });
  });

  // Add connection from grand finals R1 to R2 (conditional reset match) ONLY
  const finalsSection = data.sections.find(s => s.type === 'finals');
  if (finalsSection && finalsSection.rounds.length >= 2) {
    const grandFinalsR1 = finalsSection.rounds[0].matches[0];
    const grandFinalsR2 = finalsSection.rounds[1].matches[0];
    
    if (grandFinalsR1 && grandFinalsR2 && grandFinalsR1.position && grandFinalsR2.position) {
      const fromCenterX = grandFinalsR1.position.x + (matchWidth / 2);
      const fromCenterY = grandFinalsR1.position.y + matchHeight;
      const toCenterX = grandFinalsR2.position.x + (matchWidth / 2);
      const toCenterY = grandFinalsR2.position.y;
      
      connections.push({
        id: `${grandFinalsR1.id}-to-grand-final-r2`,
        fromMatch: grandFinalsR1.id,
        toMatch: grandFinalsR2.id,
        path: `M ${fromCenterX} ${fromCenterY} L ${toCenterX} ${toCenterY}`,
        type: 'finals',
        positioning: {
          path: `M ${fromCenterX} ${fromCenterY} L ${toCenterX} ${toCenterY}`,
          segments: [{
            type: 'vertical' as const,
            x1: fromCenterX,
            y1: fromCenterY,
            x2: toCenterX,
            y2: toCenterY
          }],
          fromPoint: { x: fromCenterX, y: fromCenterY },
          toPoint: { x: toCenterX, y: toCenterY },
          midPoint: { x: fromCenterX, y: (fromCenterY + toCenterY) / 2 },
          roundIndex: 0,
          matchIndex: 0,
          sectionType: 'finals'
        }
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
        type: 'horizontal' as const,
        x1: fromX,
        y1: fromY,
        x2: midX,
        y2: fromY,
        isFirstSegment: true
      },
      {
        type: 'vertical' as const,
        x1: midX,
        y1: fromY,
        x2: midX,
        y2: toY,
        isConnector: true
      },
      {
        type: 'horizontal' as const,
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
