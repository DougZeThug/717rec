
import { BracketMatch } from "../../types";
import { AbstractBracketLinker } from "../base/AbstractBracketLinker";
import { ConnectionCalculator, MatchOrganizer, PositionResolver } from "../utils/BracketLinkingUtilities";
import { nanoid } from "nanoid";

/**
 * Standard implementation of bracket linking for single and double elimination tournaments
 */
export class StandardBracketLinker<TMatch extends BracketMatch> extends AbstractBracketLinker<TMatch> {
  /**
   * Link all matches in the bracket
   * @param matches Array of all matches
   * @param rounds Number of rounds in winners bracket
   */
  linkMatches(matches: TMatch[], rounds: number): void {
    this.linkPlayInMatches(matches);
    this.linkWinnersBracket(matches, rounds);
    this.linkLosersBracket(matches, rounds);
    this.connectBracketSections(matches);
  }
  
  /**
   * Link play-in matches to the main bracket
   * @param matches Array of all matches
   */
  linkPlayInMatches(matches: TMatch[]): void {
    const playInMatches = matches.filter(m => m.matchType === "play-in");
    const firstRoundMatches = matches.filter(m => m.matchType === "winners" && m.round === 1);
    
    playInMatches.forEach(playInMatch => {
      // Find first round match that has a placeholder team ID matching this play-in
      const targetMatch = this.findTargetMatchForPlayIn(playInMatch, firstRoundMatches);
      
      if (targetMatch) {
        playInMatch.nextWinMatchId = targetMatch.id;
      }
    });
  }

  /**
   * Find the target match for a play-in match
   * @param playInMatch The play-in match
   * @param firstRoundMatches First round matches
   * @returns Target match or null
   */
  protected findTargetMatchForPlayIn(
    playInMatch: TMatch, 
    firstRoundMatches: TMatch[]
  ): TMatch | null {
    return firstRoundMatches.find(m => 
      m.team1Id === `play-in-${playInMatch.position}` || 
      m.team2Id === `play-in-${playInMatch.position}`
    ) || null;
  }
  
  /**
   * Link winners bracket matches
   * @param matches Array of all matches
   * @param rounds Number of rounds in winners bracket
   */
  linkWinnersBracket(matches: TMatch[], rounds: number): void {
    const winnersMatches = MatchOrganizer.organizeByRound('winners', matches);
    
    // For each round except the last one
    for (let round = 1; round < rounds; round++) {
      const currentRoundMatches = winnersMatches[round] || [];
      const nextRoundMatches = winnersMatches[round + 1] || [];
      
      currentRoundMatches.forEach((match, idx) => {
        // Link to next round winner match
        const nextPos = PositionResolver.calculateNextRoundPosition(match.position);
        const nextMatch = PositionResolver.findMatchByPosition(
          nextRoundMatches, 
          'winners', 
          round + 1, 
          nextPos
        );
        
        if (nextMatch) {
          match.nextWinMatchId = nextMatch.id;
        }
        
        // Link losers to losers bracket
        this.linkWinnerMatchToLosersBracket(match, matches, round);
      });
    }
    
    // Link final winners match to grand finals
    this.linkWinnersFinalToGrandFinals(matches, rounds);
  }
  
  /**
   * Link a winner's match loser to the losers bracket
   */
  private linkWinnerMatchToLosersBracket(
    winnerMatch: TMatch,
    allMatches: TMatch[],
    round: number
  ): void {
    const loserRound = ConnectionCalculator.calculateLoserDestinationRound(round);
    const loserPosition = ConnectionCalculator.calculateLoserDestinationPosition(
      winnerMatch.position, round
    );
    
    const loserDestination = PositionResolver.findMatchByPosition(
      allMatches,
      'losers',
      loserRound,
      loserPosition
    );
    
    if (loserDestination) {
      winnerMatch.nextLoseMatchId = loserDestination.id;
    }
  }
  
  /**
   * Link winners final to grand finals
   */
  private linkWinnersFinalToGrandFinals(
    matches: TMatch[],
    rounds: number
  ): void {
    const winnersFinal = PositionResolver.findMatchByPosition(
      matches,
      'winners',
      rounds,
      1
    );
    
    const grandFinal = PositionResolver.findMatchByPosition(
      matches,
      'finals',
      1,
      1
    );
    
    if (winnersFinal && grandFinal) {
      winnersFinal.nextWinMatchId = grandFinal.id;
    }
  }
  
  /**
   * Link losers bracket matches
   * @param matches Array of all matches
   * @param winnerRounds Number of rounds in winners bracket
   */
  linkLosersBracket(matches: TMatch[], winnerRounds: number): void {
    const losersMatches = MatchOrganizer.organizeByRound('losers', matches);
    const rounds = Object.keys(losersMatches).map(Number).sort((a, b) => a - b);
    
    // No losers bracket
    if (rounds.length === 0) {
      return;
    }
    
    // For each losers round except the last one
    for (let i = 0; i < rounds.length - 1; i++) {
      const currentRound = rounds[i];
      const nextRound = rounds[i + 1];
      
      losersMatches[currentRound].forEach((match) => {
        const nextPos = PositionResolver.calculateNextRoundPosition(match.position);
        const nextMatch = PositionResolver.findMatchByPosition(
          losersMatches[nextRound] || [],
          'losers',
          nextRound,
          nextPos
        );
        
        if (nextMatch) {
          match.nextWinMatchId = nextMatch.id;
        }
      });
    }
    
    // Link final losers match to grand finals
    this.linkLosersFinalToGrandFinals(matches, rounds[rounds.length - 1]);
  }
  
  /**
   * Link losers final to grand finals
   */
  private linkLosersFinalToGrandFinals(
    matches: TMatch[],
    finalLoserRound: number
  ): void {
    const losersFinal = PositionResolver.findMatchByPosition(
      matches,
      'losers',
      finalLoserRound,
      1
    );
    
    const grandFinal = PositionResolver.findMatchByPosition(
      matches,
      'finals',
      1,
      1
    );
    
    if (losersFinal && grandFinal) {
      losersFinal.nextWinMatchId = grandFinal.id;
    }
  }
  
  /**
   * Connect different sections of the bracket
   * @param matches Array of all matches
   */
  connectBracketSections(matches: TMatch[]): void {
    // Connect finals matches for reset
    const finalsMatches = MatchOrganizer.organizeByRound('finals', matches);
    
    if (finalsMatches[1]?.length === 1 && finalsMatches[2]?.length === 1) {
      // Link GF1 to GF2 (reset match)
      finalsMatches[1][0].nextWinMatchId = finalsMatches[2][0].id;
    }
  }
  
  /**
   * Generate finals matches
   * @param matches Array of all matches
   * @returns Updated array with finals
   */
  generateFinals(matches: TMatch[]): TMatch[] {
    const finalsMatch = this.createFinalsMatch();
    this.matchMap['finals-1'] = finalsMatch;
    matches.push(finalsMatch);
    
    return matches;
  }
  
  /**
   * Create a reset match for grand finals
   * @returns Reset match
   */
  createResetMatch(): TMatch {
    const resetMatch = this.createFinalsMatch(2);
    this.matchMap['finals-2'] = resetMatch;
    return resetMatch;
  }
  
  /**
   * Create a finals match
   * @param round Round number (default: 1)
   * @returns New finals match
   */
  protected createFinalsMatch(round: number = 1): TMatch {
    return {
      id: nanoid(),
      round,
      position: 1,
      matchType: "finals",
      team1Id: null,
      team2Id: null,
      team1Seed: null,
      team2Seed: null,
      nextWinMatchId: null,
      nextLoseMatchId: null,
      winnerId: null,
      bracket_id: this.bracketId
    } as TMatch;
  }
}
