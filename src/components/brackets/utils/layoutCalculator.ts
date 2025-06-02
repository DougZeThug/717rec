import { ProcessedBracketData, BracketConnection, BracketTheme } from "../types/bracketTypes";

export const calculateLayout = (
  data: ProcessedBracketData,
  theme: BracketTheme
): ProcessedBracketData => {
  const { matchWidth, matchHeight, columnGap, rowGap } = theme.spacing;
  
  let winnersWidth = 0;
  const winnersY = 80;
  const losersY = 500; // Move losers bracket lower
  const finalsY = 200; // Position finals to align with winners final

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

  // Calculate Finals section layout - positioned to flow from winners
  const finalsSection = data.sections.find(s => s.type === 'finals');
  if (finalsSection) {
    const finalsX = winnersWidth + columnGap; // Continue from winners bracket
    calculateFinalsSectionLayout(finalsSection, finalsX, finalsY, theme);
  }

  // Calculate connections with improved logic
  const connections = calculateConnections(data);

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
      // Improved vertical spacing calculation for proper bracket flow
      const matchesInRound = round.matches.length;
      let y = startY;
      
      if (roundIndex === 0) {
        // First round: standard spacing
        const baseSpacing = matchHeight + rowGap;
        y += matchIndex * baseSpacing;
      } else {
        // Later rounds: exponentially increasing spacing to center between source matches
        const baseSpacing = (matchHeight + rowGap) * Math.pow(2, roundIndex);
        y += matchIndex * baseSpacing;
        
        // Add offset to center the match between its source pair
        y += baseSpacing / 4;
      }
      
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
      
      // Improved losers bracket positioning
      const baseSpacing = matchHeight + rowGap;
      y += matchIndex * baseSpacing;
      
      // Add staggered positioning for visual clarity
      if (roundIndex % 2 === 1) {
        y += baseSpacing / 2;
      }
      
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
      // Position finals to align with winners bracket flow
      const y = startY + (matchIndex * (matchHeight + 40));
      match.position = { x: startX, y, width: matchWidth, height: matchHeight };
    });
    
    round.position = { x: startX, y: startY, width: matchWidth, height: matchHeight };
  });
};

const calculateConnections = (data: ProcessedBracketData): BracketConnection[] => {
  const connections: BracketConnection[] = [];
  
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

  // Add connection from winners final to grand final
  const winnersSection = data.sections.find(s => s.type === 'winners');
  const finalsSection = data.sections.find(s => s.type === 'finals');
  
  if (winnersSection && finalsSection && winnersSection.rounds.length > 0 && finalsSection.rounds.length > 0) {
    const winnersFinal = winnersSection.rounds[winnersSection.rounds.length - 1].matches[0];
    const grandFinal = finalsSection.rounds[0].matches[0];
    
    if (winnersFinal && grandFinal) {
      connections.push({
        id: `${winnersFinal.id}-to-grand-final`,
        fromMatch: winnersFinal.id,
        toMatch: grandFinal.id,
        path: generateConnectorPath(winnersFinal.position, grandFinal.position),
        type: 'finals'
      });
    }
  }
  
  return connections;
};

const generateConnectorPath = (from: any, to: any): string => {
  // Calculate center points for proper alignment
  const fromCenterX = from.x + from.width;
  const fromCenterY = from.y + from.height / 2;
  const toCenterX = to.x;
  const toCenterY = to.y + to.height / 2;
  const midX = fromCenterX + (toCenterX - fromCenterX) / 2;
  
  // Create straight connector path
  return `M ${fromCenterX} ${fromCenterY} L ${midX} ${fromCenterY} L ${midX} ${toCenterY} L ${toCenterX} ${toCenterY}`;
};
