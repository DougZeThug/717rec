
import { ProcessedBracketData, BracketConnection, BracketTheme } from "../types/bracketTypes";

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

  // Calculate Winners section layout with proper spacing
  if (winnersSection) {
    const winnersStartY = 80; // Header space
    calculateHorizontalSectionLayout(winnersSection, 40, winnersStartY, theme);
    winnersWidth = winnersSection.rounds.length * (matchWidth + columnGap);
    winnersHeight = calculateSectionHeight(winnersSection, matchHeight, rowGap);
  }

  // Calculate Losers section layout with dynamic Y position
  if (losersSection) {
    const losersStartY = winnersHeight + 180; // Dynamic gap below winners
    calculateHorizontalSectionLayout(losersSection, 40, losersStartY, theme);
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

  // Calculate connections with proper attachment points
  const connections = calculateInternalConnections(data, theme);

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

// Calculate the total height needed for a section
const calculateSectionHeight = (section: any, matchHeight: number, rowGap: number): number => {
  let maxHeight = 0;
  
  section.rounds.forEach((round: any, roundIndex: number) => {
    const roundHeight = calculateRoundHeight(round.matches.length, roundIndex, matchHeight, rowGap);
    maxHeight = Math.max(maxHeight, roundHeight);
  });
  
  return maxHeight + 100; // Add padding
};

// Calculate the height needed for a specific round
const calculateRoundHeight = (matchCount: number, roundIndex: number, matchHeight: number, rowGap: number): number => {
  if (matchCount === 0) return 0;
  
  // Calculate spacing between matches in this round
  const verticalSpacing = calculateVerticalSpacing(roundIndex, matchHeight, rowGap);
  return (matchCount * matchHeight) + ((matchCount - 1) * verticalSpacing);
};

// Calculate appropriate vertical spacing based on round index
const calculateVerticalSpacing = (roundIndex: number, matchHeight: number, rowGap: number): number => {
  // Earlier rounds need more spacing, later rounds need less
  const baseSpacing = rowGap;
  const multiplier = Math.pow(2, roundIndex);
  return Math.max(baseSpacing * multiplier, baseSpacing);
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
    
    // Calculate the total height needed for this round
    const totalMatches = round.matches.length;
    const verticalSpacing = calculateVerticalSpacing(roundIndex, matchHeight, rowGap);
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

// Calculate connections with precise attachment points
const calculateInternalConnections = (data: ProcessedBracketData, theme: BracketTheme): BracketConnection[] => {
  const connections: BracketConnection[] = [];
  const { matchWidth, matchHeight, columnGap } = theme.spacing;
  
  data.sections.forEach(section => {
    section.rounds.forEach((round, roundIndex) => {
      if (roundIndex < section.rounds.length - 1) {
        const nextRound = section.rounds[roundIndex + 1];
        
        round.matches.forEach((match, matchIndex) => {
          const nextMatchIndex = Math.floor(matchIndex / 2);
          const nextMatch = nextRound.matches[nextMatchIndex];
          
          if (nextMatch && match.position && nextMatch.position) {
            // Calculate precise attachment points
            const fromCenterX = match.position.x + matchWidth; // Right edge of source match
            const fromCenterY = match.position.y + (matchHeight / 2); // Vertical center
            const toCenterX = nextMatch.position.x; // Left edge of target match
            const toCenterY = nextMatch.position.y + (matchHeight / 2); // Vertical center
            
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

// Create connector data with improved path calculation
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
  
  // Create a clean L-shaped connector path
  const path = `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`;
  
  return {
    path,
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
