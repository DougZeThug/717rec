
import { ProcessedBracketData, BracketConnection, BracketTheme } from "../types/bracketTypes";

export const calculateLayout = (
  data: ProcessedBracketData,
  theme: BracketTheme
): ProcessedBracketData => {
  const { matchWidth, matchHeight, columnGap } = theme.spacing;
  
  const winnersSection = data.sections.find(s => s.type === 'winners');
  const losersSection = data.sections.find(s => s.type === 'losers');
  const finalsSection = data.sections.find(s => s.type === 'finals');

  // Calculate Winners section layout
  if (winnersSection) {
    calculateChallongeLayout(winnersSection, 0, 100, theme);
  }

  // Calculate Losers section layout
  if (losersSection) {
    const losersStartY = winnersSection ? 500 : 100; // Position below winners
    calculateChallongeLayout(losersSection, 0, losersStartY, theme);
  }

  // Calculate Finals section layout  
  if (finalsSection) {
    const finalsX = Math.max(
      (winnersSection?.rounds.length || 0) * 240,
      (losersSection?.rounds.length || 0) * 240,
      960 // Minimum right position
    );
    calculateChallongeLayout(finalsSection, finalsX, 300, theme);
  }

  // Calculate connections
  const connections = calculateChallongeConnections(data, theme);

  return {
    ...data,
    connections,
    dimensions: {
      width: 1600,
      height: 1000
    }
  };
};

const calculateChallongeLayout = (
  section: any,
  startX: number,
  startY: number,
  theme: BracketTheme
) => {
  const { matchWidth, matchHeight } = theme.spacing;
  const roundGap = 240; // Fixed gap between rounds like Challonge

  section.rounds.forEach((round: any, roundIndex: number) => {
    const x = startX + (roundIndex * roundGap);
    
    // Calculate vertical spacing that increases each round
    const baseSpacing = 40;
    const spacingMultiplier = Math.pow(2, roundIndex);
    const verticalSpacing = baseSpacing * spacingMultiplier;
    
    // Center matches vertically in available space
    const totalHeight = (round.matches.length * matchHeight) + 
                       ((round.matches.length - 1) * verticalSpacing);
    const roundStartY = startY;
    
    round.matches.forEach((match: any, matchIndex: number) => {
      const y = roundStartY + (matchIndex * (matchHeight + verticalSpacing));
      match.position = { 
        x, 
        y, 
        width: matchWidth, 
        height: matchHeight 
      };
    });
    
    round.position = { 
      x, 
      y: roundStartY, 
      width: matchWidth, 
      height: totalHeight 
    };
  });
};

const calculateChallongeConnections = (
  data: ProcessedBracketData,
  theme: BracketTheme
): BracketConnection[] => {
  const connections: BracketConnection[] = [];
  const { matchWidth, matchHeight } = theme.spacing;
  
  data.sections.forEach(section => {
    section.rounds.forEach((round, roundIndex) => {
      if (roundIndex < section.rounds.length - 1) {
        const nextRound = section.rounds[roundIndex + 1];
        
        round.matches.forEach((match, matchIndex) => {
          const nextMatchIndex = Math.floor(matchIndex / 2);
          const nextMatch = nextRound.matches[nextMatchIndex];
          
          if (nextMatch && match.position && nextMatch.position) {
            // Challonge-style L-shaped connectors
            const fromX = match.position.x + matchWidth;
            const fromY = match.position.y + (matchHeight / 2);
            const toX = nextMatch.position.x;
            const toY = nextMatch.position.y + (matchHeight / 2);
            
            const midX = fromX + 60; // Horizontal segment length
            
            const path = `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`;
            
            connections.push({
              id: `${match.id}-to-${nextMatch.id}`,
              fromMatch: match.id,
              toMatch: nextMatch.id,
              path,
              type: section.type,
              positioning: {
                path,
                segments: [
                  {
                    type: 'horizontal' as const,
                    x1: fromX,
                    y1: fromY,
                    x2: midX,
                    y2: fromY
                  },
                  {
                    type: 'vertical' as const,
                    x1: midX,
                    y1: fromY,
                    x2: midX,
                    y2: toY
                  },
                  {
                    type: 'horizontal' as const,
                    x1: midX,
                    y1: toY,
                    x2: toX,
                    y2: toY
                  }
                ],
                fromPoint: { x: fromX, y: fromY },
                toPoint: { x: toX, y: toY },
                midPoint: { x: midX, y: (fromY + toY) / 2 },
                roundIndex,
                matchIndex,
                sectionType: section.type
              }
            });
          }
        });
      }
    });
  });

  return connections;
};
