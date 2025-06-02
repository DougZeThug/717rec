
import { ProcessedBracketData, BracketConnection, BracketTheme } from "../types/bracketTypes";

export const calculateLayout = (
  data: ProcessedBracketData,
  theme: BracketTheme
): ProcessedBracketData => {
  console.log('🔍 layoutCalculator: Starting layout calculation');
  const { matchWidth, matchHeight } = theme.spacing;
  
  const winnersSection = data.sections.find(s => s.type === 'winners');
  const losersSection = data.sections.find(s => s.type === 'losers');
  const finalsSection = data.sections.find(s => s.type === 'finals');

  console.log('🔍 layoutCalculator: Processing sections:', {
    winners: !!winnersSection,
    losers: !!losersSection,
    finals: !!finalsSection
  });

  // Calculate Winners section layout (left column)
  if (winnersSection) {
    calculateColumnLayout(winnersSection, 0, 100, theme, 'left');
  }

  // Calculate Finals section layout (center column)
  if (finalsSection) {
    const finalsX = winnersSection ? (winnersSection.rounds.length * 240) + 100 : 400;
    calculateColumnLayout(finalsSection, finalsX, 300, theme, 'center');
    console.log('🔍 layoutCalculator: Finals section positioned at x:', finalsX);
  }

  // Calculate Losers section layout (right column)  
  if (losersSection) {
    const losersX = Math.max(
      (winnersSection?.rounds.length || 0) * 240 + 400,
      (finalsSection ? 600 : 400)
    );
    calculateColumnLayout(losersSection, losersX, 500, theme, 'right');
  }

  // Calculate connections with proper cross-bracket support
  const connections = calculateConnections(data, theme);
  console.log('🔍 layoutCalculator: Generated connections:', connections.length);

  return {
    ...data,
    connections,
    dimensions: {
      width: 1600,
      height: 1000
    }
  };
};

const calculateColumnLayout = (
  section: any,
  startX: number,
  startY: number,
  theme: BracketTheme,
  alignment: 'left' | 'center' | 'right'
) => {
  const { matchWidth, matchHeight } = theme.spacing;
  const roundGap = 240;

  section.rounds.forEach((round: any, roundIndex: number) => {
    const x = startX + (roundIndex * roundGap);
    
    // Calculate vertical spacing that increases each round for winners/losers
    // Finals matches should be centered
    let verticalSpacing = 40;
    if (section.type !== 'finals') {
      const spacingMultiplier = Math.pow(2, roundIndex);
      verticalSpacing = 40 * spacingMultiplier;
    }
    
    // Center matches vertically
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

const calculateConnections = (
  data: ProcessedBracketData,
  theme: BracketTheme
): BracketConnection[] => {
  const connections: BracketConnection[] = [];
  const { matchWidth, matchHeight } = theme.spacing;
  
  // Generate connections within each section
  data.sections.forEach(section => {
    section.rounds.forEach((round, roundIndex) => {
      if (roundIndex < section.rounds.length - 1) {
        const nextRound = section.rounds[roundIndex + 1];
        
        round.matches.forEach((match, matchIndex) => {
          const nextMatchIndex = Math.floor(matchIndex / 2);
          const nextMatch = nextRound.matches[nextMatchIndex];
          
          if (nextMatch && match.position && nextMatch.position) {
            const fromX = match.position.x + matchWidth;
            const fromY = match.position.y + (matchHeight / 2);
            const toX = nextMatch.position.x;
            const toY = nextMatch.position.y + (matchHeight / 2);
            
            const midX = fromX + 60;
            const path = `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`;
            
            connections.push({
              id: `${match.id}-to-${nextMatch.id}`,
              fromMatch: match.id,
              toMatch: nextMatch.id,
              path,
              type: section.type
            });
          }
        });
      }
    });
  });

  // Add cross-bracket connections (winners to losers)
  const winnersSection = data.sections.find(s => s.type === 'winners');
  const losersSection = data.sections.find(s => s.type === 'losers');
  
  if (winnersSection && losersSection) {
    winnersSection.rounds.forEach(winnersRound => {
      winnersRound.matches.forEach(winnersMatch => {
        if (winnersMatch.nextLoseMatchId) {
          // Find the corresponding losers match
          for (const losersRound of losersSection.rounds) {
            const loserMatch = losersRound.matches.find(m => m.id === winnersMatch.nextLoseMatchId);
            if (loserMatch && winnersMatch.position && loserMatch.position) {
              const fromX = winnersMatch.position.x + matchWidth;
              const fromY = winnersMatch.position.y + matchHeight;
              const toX = loserMatch.position.x;
              const toY = loserMatch.position.y + (matchHeight / 2);
              
              const midX = (fromX + toX) / 2;
              const midY = fromY + 50;
              
              const path = `M ${fromX} ${fromY} L ${fromX + 30} ${fromY} L ${fromX + 30} ${midY} L ${toX - 30} ${midY} L ${toX - 30} ${toY} L ${toX} ${toY}`;
              
              connections.push({
                id: `cross-${winnersMatch.id}-to-${loserMatch.id}`,
                fromMatch: winnersMatch.id,
                toMatch: loserMatch.id,
                path,
                type: 'cross-bracket'
              });
              break;
            }
          }
        }
      });
    });
  }

  return connections;
};
