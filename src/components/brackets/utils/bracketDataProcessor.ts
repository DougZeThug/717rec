
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
  position: match.position || 0
});

export const processBracketData = (bracket: SimpleBracketData): ProcessedBracketData => {
  // Separate matches by type
  const winnerMatches = bracket.matches
    .filter(match => match.matchType === 'winners' || match.matchType === 'winner')
    .map(transformMatch);
  
  const loserMatches = bracket.matches
    .filter(match => match.matchType === 'losers' || match.matchType === 'loser')
    .map(transformMatch);
  
  const finalMatches = bracket.matches
    .filter(match => match.matchType === 'finals' || match.matchType === 'final')
    .map(transformMatch);

  // Group matches into rounds
  const winnersSection = createSection('winners', 'Winners Bracket', winnerMatches);
  const losersSection = createSection('losers', 'Losers Bracket', loserMatches);
  const finalsSection = createSection('finals', 'Finals', finalMatches);

  const sections = [winnersSection, losersSection, finalsSection].filter(s => s.rounds.length > 0);

  return {
    sections,
    connections: [], // Will be calculated by layout calculator
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
      title: getRoundTitle(type, roundNumber, roundMatches.length),
      matches: roundMatches.sort((a, b) => a.position - b.position),
      position: { x: 0, y: 0, width: 0, height: 0 },
      matchType: type
    }));
};

const getRoundTitle = (type: 'winners' | 'losers' | 'finals', round: number, matchCount: number): string => {
  if (type === 'finals') return 'Grand Final';
  if (type === 'losers') return `LR${round}`;
  
  // Winners bracket titles
  if (matchCount === 1) return 'Winners Final';
  if (matchCount === 2) return 'Semifinals';
  return `Round ${round}`;
};
