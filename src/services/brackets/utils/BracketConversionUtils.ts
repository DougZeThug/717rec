import { PlayoffMatch } from '@/types';

import { BracketMatchesByType } from '../types';

/**
 * Raw match shape from brackets-manager library
 */
interface BracketsManagerMatch {
  id: string;
  round: number;
  position: number;
  group: 'WINNER' | 'LOSER' | 'FINAL';
  opponent1: {
    id: string | null;
    position?: number | null;
    score?: number | null;
    result?: string | null;
  } | null;
  opponent2: {
    id: string | null;
    position?: number | null;
    score?: number | null;
    result?: string | null;
  } | null;
  child_match_id?: string | null;
  child_match_id_loser?: string | null;
  best_of?: number;
}

/**
 * Map data from brackets-manager format to our app format
 */
export function mapBracketsToAppFormat(
  bracketId: string,
  matches: BracketsManagerMatch[]
): BracketMatchesByType {
  // Group matches by type and round
  const winnerMatches: PlayoffMatch[][] = [];
  const loserMatches: PlayoffMatch[][] = [];
  const finalsMatches: PlayoffMatch[] = [];

  matches.forEach((match) => {
    if (match.group === 'WINNER') {
      if (!winnerMatches[match.round - 1]) {
        winnerMatches[match.round - 1] = [];
      }
      winnerMatches[match.round - 1].push(convertToAppMatch(match, bracketId));
    } else if (match.group === 'LOSER') {
      if (!loserMatches[match.round - 1]) {
        loserMatches[match.round - 1] = [];
      }
      loserMatches[match.round - 1].push(convertToAppMatch(match, bracketId));
    } else if (match.group === 'FINAL') {
      finalsMatches.push(convertToAppMatch(match, bracketId));
    }
  });

  return {
    winners: winnerMatches,
    losers: loserMatches,
    finals: finalsMatches,
  };
}

/**
 * Convert a brackets-manager match to our app format
 */
export function convertToAppMatch(match: BracketsManagerMatch, bracketId: string): PlayoffMatch {
  return {
    id: match.id,
    round: match.round,
    position: match.position,
    matchType: match.group.toLowerCase(),
    team1Id: match.opponent1?.id || null,
    team2Id: match.opponent2?.id || null,
    team1Seed: match.opponent1?.position || null,
    team2Seed: match.opponent2?.position || null,
    team1Score: match.opponent1?.score || null,
    team2Score: match.opponent2?.score || null,
    winnerId:
      match.opponent1?.result === 'win'
        ? match.opponent1.id
        : match.opponent2?.result === 'win'
          ? match.opponent2.id
          : null,
    nextWinMatchId: match.child_match_id || null,
    nextLoseMatchId: match.child_match_id_loser || null,
    bestOf: match.best_of || 3,
    bracket_id: bracketId,
  };
}
