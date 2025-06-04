
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
  order: match.position || 0, // Use database position field for ordering
  position: undefined, // Layout position will be calculated later
  nextWinMatchId: match.nextWinMatchId, // Map database relationship field
  nextLoseMatchId: match.nextLoseMatchId // Map database relationship field
});

export const processBracketData = (bracket: SimpleBracketData): ProcessedBracketData => {
  console.log('Processing bracket data with relationships:', {
    totalMatches: bracket.matches?.length || 0,
    matchesWithNextWin: bracket.matches?.filter(m => m.nextWinMatchId).length || 0,
    matchesWithNextLose: bracket.matches?.filter(m => m.nextLoseMatchId).length || 0
  });

  // Separate matches by type and ensure proper sorting by position
  const winnerMatches = bracket.matches
    .filter(match => match.matchType === 'winners' || match.matchType === 'winner')
    .sort((a, b) => a.position - b.position) // Sort by database position field
    .map(transformMatch);
  
  const loserMatches = bracket.matches
    .filter(match => match.matchType === 'losers' || match.matchType === 'loser')
    .sort((a, b) => a.position - b.position) // Sort by database position field
    .map(transformMatch);
  
  const finalMatches = bracket.matches
    .filter(match => match.matchType === 'finals' || match.matchType === 'final')
    .sort((a, b) => a.position - b.position) // Sort by database position field
    .map(transformMatch);

  console.log('Matches sorted by position:', {
    winners: winnerMatches.length,
    losers: loserMatches.length,
    finals: finalMatches.length
  });

  // Group matches into rounds with improved logic
  const winnersSection = createSection('winners', 'Winners Bracket', winnerMatches);
  const losersSection = createSection('losers', 'Losers Bracket', loserMatches);
  const finalsSection = createSection('finals', 'Grand Finals', finalMatches);

  const sections = [winnersSection, losersSection, finalsSection].filter(s => s.rounds.length > 0);

  return {
    sections,
    connections: [], // Will be calculated by layout calculator using relationship fields
    dimensions: {
      width: 1200, // Will be calculated dynamically
      height: 800
    }
  };
};

const createSection = (
  type: 'winners' | 'losers' | 'finals',
  title: string,
  matches: BracketMatch[]
): BracketSection => {
  const rounds = groupMatchesByRound(matches, type);
  
  return {
    type,
    title,
    rounds,
    position: { x: 0, y: 0, width: 0, height: 0 } // Will be calculated by layout
  };
};

const groupMatchesByRound = (matches: BracketMatch[], type: 'winners' | 'losers' | 'finals'): BracketRound[] => {
  const roundsMap = new Map<number, BracketMatch[]>();
  
  matches.forEach(match => {
    const round = match.round;
    if (!roundsMap.has(round)) {
      roundsMap.set(round, []);
    }
    roundsMap.get(round)!.push(match);
  });

  return Array.from(roundsMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([roundNumber, roundMatches], index) => ({
      id: `${type}-round-${roundNumber}`,
      title: getRoundTitle(type, roundNumber, roundMatches.length, roundsMap.size),
      matches: roundMatches.sort((a, b) => a.order - b.order), // Sort by position field from database
      position: { x: 0, y: 0, width: 0, height: 0 },
      matchType: type
    }));
};

const getRoundTitle = (type: 'winners' | 'losers' | 'finals', round: number, matchCount: number, totalRounds: number): string => {
  if (type === 'finals') {
    // Handle two finals rounds for double elimination
    if (round === 1) return 'Grand Finals';
    if (round === 2) return 'Grand Finals (Reset)';
    return 'Grand Finals';
  }
  
  if (type === 'losers') {
    // More descriptive losers bracket naming
    if (round === totalRounds && matchCount === 1) return 'Losers Finals';
    return `LR${round}`;
  }
  
  // Fixed Winners bracket titles - properly identify semifinals and finals
  if (type === 'winners') {
    if (round === totalRounds && matchCount === 1) return 'Winners Finals';
    if (round === totalRounds - 1 && matchCount === 2) return 'Semifinals';
    if (round === totalRounds - 2 && matchCount === 4) return 'Quarterfinals';
    
    return `Round ${round}`;
  }
  
  return `Round ${round}`;
};
