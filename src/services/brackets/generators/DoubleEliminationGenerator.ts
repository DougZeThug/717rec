
import { nanoid } from "nanoid";
import { BracketMatch } from "../types";
import { BaseBracketGenerator } from "./BaseBracketGenerator";
import { WinnersBracketLinker } from "../linkers/WinnersBracketLinker";
import { LosersBracketLinker } from "../linkers/LosersBracketLinker";
import { FinalsLinker } from "../linkers/FinalsLinker";

/**
 * Generator for double elimination brackets
 */
export class DoubleEliminationGenerator extends BaseBracketGenerator {
  /**
   * Generate a double elimination bracket
   * @returns Array of matches for the bracket
   */
  generate(): BracketMatch[] {
    // Create match mapping for quick access
    const matchMap: Record<string, BracketMatch> = {};
    
    // Get teams that will be in the main bracket (after potential play-ins)
    const { playInMatches, advancingTeams } = this.handlePlayInMatches();
    
    // Add play-in matches to the matchMap with proper keys
    playInMatches.forEach((match) => {
      match.matchType = "play-in";
      match.round = 0;
      const key = `play-in-0-${match.position}`;
      matchMap[key] = match;
    });
    
    // Generate winners bracket with advancing teams
    const winnersBracketLinker = new WinnersBracketLinker(this.bracketId, advancingTeams, matchMap);
    winnersBracketLinker.generateMatches();
    
    // Store original keys for losers bracket matches before shifting rounds
    let loserBracketKeys: string[] = [];
    if (playInMatches.length > 0) {
      loserBracketKeys = Object.keys(matchMap).filter(k => k.startsWith("losers-"));
    }
    
    // Generate losers bracket linked to winners bracket
    const losersBracketLinker = new LosersBracketLinker(this.bracketId, this.bracketSize, matchMap);
    losersBracketLinker.generateMatches();
    
    // If we have play-in matches, we need to:
    // 1. Create Losers Round 0 for play-in losers
    // 2. Shift all existing losers rounds up by 1
    if (playInMatches.length > 0) {
      this.createLosersRoundZero(playInMatches, matchMap);
      this.shiftLosersRounds(loserBracketKeys, matchMap);
    }
    
    // Create finals match
    const finalsLinker = new FinalsLinker(this.bracketId, matchMap);
    finalsLinker.generateFinals();
    
    // Link play-in winners to Winners Round 1
    if (playInMatches.length > 0) {
      this.linkPlayInWinnersToWinnersRound1(playInMatches, matchMap);
    }
    
    return Object.values(matchMap);
  }

  /**
   * Create Losers Round 0 matches for play-in losers
   */
  private createLosersRoundZero(playInMatches: BracketMatch[], matchMap: Record<string, BracketMatch>): void {
    playInMatches.forEach((match, idx) => {
      // Create a Losers Round 0 match for each play-in match
      const losersMatch: BracketMatch = {
        id: nanoid(),
        round: 0,
        position: match.position,
        matchType: "losers",
        team1Id: null, // Will be filled with loser of play-in
        team2Id: null, // Losers Round 0 matches only have one team
        team1Seed: null,
        team2Seed: null,
        nextWinMatchId: null,
        nextLoseMatchId: null,
        winnerId: null,
        bracket_id: this.bracketId
      };
      
      // Find appropriate Losers Round 1 match (which will become Round 2 after shifting)
      // to link this Losers Round 0 match to
      const losersRound1Key = Object.keys(matchMap).find(k => 
        k.startsWith("losers-1-") && 
        k.endsWith(`-${Math.ceil(match.position/2)}`)
      );
      
      if (losersRound1Key && matchMap[losersRound1Key]) {
        losersMatch.nextWinMatchId = matchMap[losersRound1Key].id;
      }
      
      // Add to matchMap
      const key = `losers-0-${match.position}`;
      matchMap[key] = losersMatch;
      
      // Link play-in match's loser to this new Losers Round 0 match
      match.nextLoseMatchId = losersMatch.id;
    });
  }
  
  /**
   * Shift all losers rounds up by 1 (Round 1 becomes Round 2, etc.)
   */
  private shiftLosersRounds(originalKeys: string[], matchMap: Record<string, BracketMatch>): void {
    // Process in reverse order to avoid overwriting matches
    const keysToProcess = [...originalKeys].sort((a, b) => {
      // Extract round numbers for sorting in descending order
      const roundA = parseInt(a.split('-')[1], 10);
      const roundB = parseInt(b.split('-')[1], 10);
      return roundB - roundA;
    });
    
    keysToProcess.forEach(oldKey => {
      const match = matchMap[oldKey];
      if (!match || match.matchType !== 'losers') return;
      
      // Parse the key components
      const [prefix, roundStr, ...rest] = oldKey.split('-');
      const roundNum = parseInt(roundStr, 10);
      
      // Create new key with round number incremented
      const newKey = `${prefix}-${roundNum + 1}-${rest.join('-')}`;
      
      // Update the match round
      match.round = roundNum + 1;
      
      // Update the key in the map
      delete matchMap[oldKey];
      matchMap[newKey] = match;
    });

    // Fix the nextWinMatchId and nextLoseMatchId references
    // that might be pointing to the old keys
    Object.values(matchMap).forEach(match => {
      if (match.matchType === "losers") {
        // Relink losers matches to their next winners match
        // (if it exists and is also a losers match)
        if (match.nextWinMatchId) {
          const nextMatch = Object.values(matchMap).find(m => m.id === match.nextWinMatchId);
          if (nextMatch && nextMatch.matchType === "losers") {
            // The next match exists and is also in the losers bracket
            // No need to update the ID reference since that's already correct
            // We just needed to verify it exists
          }
        }
      }
    });
  }
  
  /**
   * Link play-in winners to Winners Round 1, replacing placeholder team IDs with null
   * and setting up the connection through nextWinMatchId
   */
  private linkPlayInWinnersToWinnersRound1(playInMatches: BracketMatch[], matchMap: Record<string, BracketMatch>): void {
    const round1Keys = Object.keys(matchMap)
      .filter(k => k.startsWith("winners-1-"))
      .sort((a, b) => {
        const posA = parseInt(a.split('-')[2], 10);
        const posB = parseInt(b.split('-')[2], 10);
        return posA - posB;
      });
    
    // Find Winners Round 1 matches with placeholder team IDs
    round1Keys.forEach(key => {
      const match = matchMap[key];
      
      // Check for placeholder IDs and replace with null
      if (match.team1Id && match.team1Id.startsWith('play-in-')) {
        const playInPosition = parseInt(match.team1Id.split('-')[2], 10);
        const playInMatch = playInMatches.find(m => m.position === playInPosition);
        
        if (playInMatch) {
          // Replace placeholder with null
          match.team1Id = null;
          
          // Link play-in match's winner to this position
          playInMatch.nextWinMatchId = match.id;
        }
      }
      
      if (match.team2Id && match.team2Id.startsWith('play-in-')) {
        const playInPosition = parseInt(match.team2Id.split('-')[2], 10);
        const playInMatch = playInMatches.find(m => m.position === playInPosition);
        
        if (playInMatch) {
          // Replace placeholder with null
          match.team2Id = null;
          
          // Link play-in match's winner to this position
          playInMatch.nextWinMatchId = match.id;
        }
      }
    });
    
    // Link play-in losers to Losers Round 0
    playInMatches.forEach((playInMatch) => {
      const loserMatchKey = `losers-0-${playInMatch.position}`;
      if (matchMap[loserMatchKey]) {
        playInMatch.nextLoseMatchId = matchMap[loserMatchKey].id;
      }
    });
  }
}
