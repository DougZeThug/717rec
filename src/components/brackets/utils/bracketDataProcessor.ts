
import { SimpleBracketData } from "@/hooks/brackets/useBracketData";
import { BracketMatch, BracketSection, ProcessedBracketData, BracketRound } from "../types/bracketTypes";

export const transformMatch = (match: any): BracketMatch => ({
  id: match.id,
  team1Name: match.team1Name || 'TBD',
  team2Name: match.team2Name || 'TBD',
  team1Logo: match.team1Logo,
  team2Logo: match.team2Logo,
  team1Score: match.team1Score,
  team2Score: match.team2Score,
  team1Seed: match.team1Seed,
  team2Seed: match.team2Seed,
  winnerId: match.winnerId,
  team1Id: match.team1Id,
  team2Id: match.team2Id,
  status: match.status || 'pending',
  matchType: match.matchType === 'winner' ? 'winners' : match.matchType,
  round: match.round || 1,
  order: match.position || 0,
  position: undefined,
  nextWinMatchId: match.next_win_match_id || match.nextWinMatchId,
  nextLoseMatchId: match.next_lose_match_id || match.nextLoseMatchId
});

export const processBracketData = (bracket: SimpleBracketData): ProcessedBracketData => {
  console.log('🔍 processBracketData: Input bracket data:', bracket);
  console.log('🔍 processBracketData: Raw matches:', bracket.matches);
  
  // Separate matches by type with better logging
  const winnerMatches = bracket.matches
    .filter(match => {
      const isWinner = match.matchType === 'winners' || match.matchType === 'winner';
      if (isWinner) console.log('🔍 processBracketData: Found winner match:', match);
      return isWinner;
    })
    .map(transformMatch);
  
  const loserMatches = bracket.matches
    .filter(match => {
      const isLoser = match.matchType === 'losers' || match.matchType === 'loser';
      if (isLoser) console.log('🔍 processBracketData: Found loser match:', match);
      return isLoser;
    })
    .map(transformMatch);
  
  const finalMatches = bracket.matches
    .filter(match => {
      const isFinal = match.matchType === 'finals' || match.matchType === 'final';
      if (isFinal) console.log('🔍 processBracketData: Found final match:', match);
      return isFinal;
    })
    .map(transformMatch);

  console.log('🔍 processBracketData: Processed matches:', {
    winners: winnerMatches.length,
    losers: loserMatches.length,
    finals: finalMatches.length
  });

  // Group matches into rounds with improved logic
  const winnersSection = createSection('winners', 'Winners Bracket', winnerMatches);
  const losersSection = createSection('losers', 'Losers Bracket', loserMatches);
  const finalsSection = createSection('finals', 'Grand Finals', finalMatches);

  console.log('🔍 processBracketData: Created sections:', {
    winnersRounds: winnersSection.rounds.length,
    losersRounds: losersSection.rounds.length,
    finalsRounds: finalsSection.rounds.length
  });

  const sections = [winnersSection, losersSection, finalsSection].filter(s => s.rounds.length > 0);

  return {
    sections,
    connections: [], // Will be calculated by layout calculator
    dimensions: {
      width: 1200,
      height: 800
    }
  };
};

const createSection = (
  type: 'winners' | 'losers' | 'finals',
  title: string,
  matches: BracketMatch[]
): BracketSection => {
  console.log(`🔍 createSection: Creating ${type} section with ${matches.length} matches`);
  const rounds = groupMatchesByRound(matches, type);
  
  return {
    type,
    title,
    rounds,
    position: { x: 0, y: 0, width: 0, height: 0 }
  };
};

const groupMatchesByRound = (matches: BracketMatch[], type: 'winners' | 'losers' | 'finals'): BracketRound[] => {
  console.log(`🔍 groupMatchesByRound: Grouping ${matches.length} ${type} matches`);
  
  const roundsMap = new Map<number, BracketMatch[]>();
  
  matches.forEach(match => {
    const round = match.round;
    if (!roundsMap.has(round)) {
      roundsMap.set(round, []);
    }
    roundsMap.get(round)!.push(match);
  });

  const rounds = Array.from(roundsMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([roundNumber, roundMatches], index) => ({
      id: `${type}-round-${roundNumber}`,
      title: getRoundTitle(type, roundNumber, roundMatches.length, roundsMap.size),
      matches: roundMatches.sort((a, b) => a.order - b.order),
      position: { x: 0, y: 0, width: 0, height: 0 },
      matchType: type
    }));

  console.log(`🔍 groupMatchesByRound: Created ${rounds.length} rounds for ${type}`);
  return rounds;
};

const getRoundTitle = (type: 'winners' | 'losers' | 'finals', round: number, matchCount: number, totalRounds: number): string => {
  if (type === 'finals') {
    if (round === 1) return 'Grand Finals';
    if (round === 2) return 'Grand Finals (Reset)';
    return 'Grand Finals';
  }
  
  if (type === 'losers') {
    if (round === totalRounds && matchCount === 1) return 'Losers Finals';
    return `LR${round}`;
  }
  
  if (type === 'winners') {
    if (round === totalRounds && matchCount === 1) return 'Winners Finals';
    if (round === totalRounds - 1 && matchCount === 2) return 'Semifinals';
    if (round === totalRounds - 2 && matchCount === 4) return 'Quarterfinals';
    
    return `Round ${round}`;
  }
  
  return `Round ${round}`;
};
