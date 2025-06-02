
import { ProcessedBracketData, BracketConnection, BracketTheme } from "../types/bracketTypes";

export const calculateLayout = (
  data: ProcessedBracketData,
  theme: BracketTheme
): ProcessedBracketData => {
  const { matchWidth, matchHeight, columnGap, rowGap } = theme.spacing;
  
  let currentX = 0;
  const winnersY = 80;
  const losersY = 400;
  const finalsY = 240;

  // Calculate positions for each section
  data.sections.forEach(section => {
    if (section.type === 'winners') {
      calculateWinnersSectionLayout(section, currentX, winnersY, theme);
      currentX += (section.rounds.length * (matchWidth + columnGap));
    } else if (section.type === 'losers') {
      calculateLosersSectionLayout(section, 0, losersY, theme);
    } else if (section.type === 'finals') {
      calculateFinalsSectionLayout(section, currentX + columnGap, finalsY, theme);
    }
  });

  // Calculate connections
  const connections = calculateConnections(data);

  return {
    ...data,
    connections,
    dimensions: {
      width: Math.max(1200, currentX + matchWidth + 100),
      height: 600
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
      const verticalSpacing = Math.pow(2, roundIndex) * (matchHeight + rowGap);
      const y = startY + (matchIndex * verticalSpacing);
      
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
      let y = startY;
      
      // Adjust Y position based on round pattern
      if (roundIndex % 2 === 1) {
        y -= 45; // Offset alternating rounds
      }
      
      y += matchIndex * (matchHeight + rowGap * 2);
      
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
  
  section.rounds.forEach((round: any) => {
    round.matches.forEach((match: any) => {
      match.position = { x: startX, y: startY, width: matchWidth, height: matchHeight };
    });
    
    round.position = { x: startX, y: startY, width: matchWidth, height: matchHeight };
  });
};

const calculateConnections = (data: ProcessedBracketData): BracketConnection[] => {
  const connections: BracketConnection[] = [];
  
  // Basic connector logic - can be enhanced later
  data.sections.forEach(section => {
    section.rounds.forEach((round, roundIndex) => {
      if (roundIndex < section.rounds.length - 1) {
        const nextRound = section.rounds[roundIndex + 1];
        
        round.matches.forEach((match, matchIndex) => {
          const nextMatchIndex = Math.floor(matchIndex / 2);
          const nextMatch = nextRound.matches[nextMatchIndex];
          
          if (nextMatch) {
            connections.push({
              id: `${match.id}-to-${nextMatch.id}`,
              fromMatch: match.id,
              toMatch: nextMatch.id,
              path: generateConnectorPath(match.position, nextMatch.position),
              type: section.type
            });
          }
        });
      }
    });
  });
  
  return connections;
};

const generateConnectorPath = (from: any, to: any): string => {
  const fromX = from.x + from.width;
  const fromY = from.y + from.height / 2;
  const toX = to.x;
  const toY = to.y + to.height / 2;
  const midX = fromX + (toX - fromX) / 2;
  
  return `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`;
};
