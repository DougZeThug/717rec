
import { nanoid } from 'nanoid';
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

interface SeedTeam {
  id: string;
  name: string;
  seed: number;
  imageUrl?: string;
  logoUrl?: string;
}

export interface BracketMatch {
  id: string;
  round: number;
  position: number;
  matchType: "play-in" | "winners" | "losers" | "finals";
  team1Id: string | null;
  team2Id: string | null;
  team1Seed: number | null;
  team2Seed: number | null;
  nextWinMatchId: string | null;
  nextLoseMatchId: string | null;
  winnerId: string | null;
  bracket_id: string;
}

export class BracketGenerator {
  /**
   * Calculate the next power of 2 for bracket size
   */
  static calculateBracketSize(teamCount: number): number {
    let power = 1;
    while (power < teamCount) {
      power *= 2;
    }
    return power;
  }

  /**
   * Sort and seed teams based on their seed property
   */
  static prepareTeams(teams: Team[]): SeedTeam[] {
    // Make a copy of teams to avoid mutating the original
    const seedTeams: SeedTeam[] = teams.map((team, index) => ({
      id: team.id,
      name: team.name,
      seed: team.seed || index + 1, // Use existing seed or assign based on index
      imageUrl: team.imageUrl,
      logoUrl: team.logoUrl,
    }));
    
    // Sort by seed value
    return seedTeams.sort((a, b) => a.seed - b.seed);
  }

  /**
   * Create play-in matches for the lowest seeds when teamCount is not a power of 2
   */
  static createPlayInMatches(teams: SeedTeam[], targetSize: number): { 
    playInMatches: BracketMatch[],
    advancingTeams: SeedTeam[] 
  } {
    const playInMatches: BracketMatch[] = [];
    const advancingTeams = [...teams];
    
    const numPlayInMatches = teams.length - (targetSize / 2);
    
    if (numPlayInMatches <= 0) {
      return { playInMatches: [], advancingTeams };
    }
    
    // For play-in matches, we match highest remaining seed vs lowest remaining seed
    // 1 & 16, 8 & 9, etc. to get 8 teams advancing
    const playInTeams = advancingTeams.splice(-numPlayInMatches * 2);
    
    for (let i = 0; i < numPlayInMatches; i++) {
      const team1Index = i;
      const team2Index = (numPlayInMatches * 2) - i - 1;
      
      if (team1Index < playInTeams.length && team2Index < playInTeams.length) {
        const team1 = playInTeams[team1Index];
        const team2 = playInTeams[team2Index];
        
        playInMatches.push({
          id: nanoid(),
          round: 0, // Play-in round is 0
          position: i + 1,
          matchType: "play-in",
          team1Id: team1.id,
          team2Id: team2.id,
          team1Seed: team1.seed,
          team2Seed: team2.seed,
          nextWinMatchId: null, // Will be set later
          nextLoseMatchId: null, // No loser bracket for play-in
          winnerId: null,
          bracket_id: ""  // Will be set when saving
        });
        
        // Add a placeholder for the winner
        advancingTeams.push({
          id: `play-in-${i+1}`, // Temporary ID that will be replaced with winner
          name: `Play-in ${i+1} Winner`,
          seed: Math.min(team1.seed, team2.seed), // Winner keeps the better seed
          imageUrl: undefined,
          logoUrl: undefined
        });
      }
    }
    
    return { playInMatches, advancingTeams };
  }

  /**
   * Generate a complete double elimination bracket
   */
  static generateDoubleEliminationBracket(
    bracketId: string, 
    teams: Team[]
  ): BracketMatch[] {
    // Prepare teams with proper seeding
    const seededTeams = this.prepareTeams(teams);
    const totalTeams = seededTeams.length;
    
    // Calculate bracket size (next power of 2)
    const bracketSize = this.calculateBracketSize(totalTeams);
    
    // Initialize matches array
    const matches: BracketMatch[] = [];
    
    // Create play-in matches if needed
    const { playInMatches, advancingTeams } = this.createPlayInMatches(
      seededTeams, 
      bracketSize
    );
    matches.push(...playInMatches);
    
    // Map to store matches by round and position for linking
    const matchMap: Record<string, BracketMatch> = {};
    
    // Generate winners bracket
    this.generateWinnersBracket(bracketId, advancingTeams, matches, matchMap);
    
    // Generate losers bracket 
    this.generateLosersBracket(bracketId, bracketSize / 2, matches, matchMap);
    
    // Create finals match
    this.createFinalsMatch(bracketId, matches, matchMap);
    
    // Link play-in matches to first round
    this.linkPlayInMatches(matches);
    
    return matches;
  }
  
  /**
   * Generate the winners bracket portion
   */
  private static generateWinnersBracket(
    bracketId: string,
    teams: SeedTeam[],
    matches: BracketMatch[],
    matchMap: Record<string, BracketMatch>
  ): void {
    const numRounds = Math.log2(this.calculateBracketSize(teams.length));
    
    // First round matches
    const firstRoundTeams = [...teams];
    const numFirstRoundMatches = firstRoundTeams.length / 2;
    
    // Create all rounds in the winners bracket
    for (let round = 1; round <= numRounds; round++) {
      const matchesInRound = Math.pow(2, numRounds - round);
      
      for (let position = 1; position <= matchesInRound; position++) {
        const match: BracketMatch = {
          id: nanoid(),
          round,
          position,
          matchType: "winners",
          team1Id: null,
          team2Id: null,
          team1Seed: null,
          team2Seed: null,
          nextWinMatchId: null,
          nextLoseMatchId: null,
          winnerId: null,
          bracket_id: bracketId
        };
        
        // Set first round teams based on seeding
        if (round === 1) {
          const teamIndex = (position - 1) * 2;
          if (teamIndex < firstRoundTeams.length) {
            match.team1Id = firstRoundTeams[teamIndex].id;
            match.team1Seed = firstRoundTeams[teamIndex].seed;
          }
          
          if (teamIndex + 1 < firstRoundTeams.length) {
            match.team2Id = firstRoundTeams[teamIndex + 1].id;
            match.team2Seed = firstRoundTeams[teamIndex + 1].seed;
          }
        }
        
        matches.push(match);
        
        // Store match in map for linking
        const key = `winners-${round}-${position}`;
        matchMap[key] = match;
        
        // Link winners to next round
        if (round < numRounds) {
          const nextPosition = Math.ceil(position / 2);
          const nextKey = `winners-${round+1}-${nextPosition}`;
          match.nextWinMatchId = matchMap[nextKey]?.id || null;
        }
        
        // Link losers to losers bracket (except finals)
        if (round < numRounds) {
          const loserRound = round;
          const loserPosition = position;
          const loserKey = `losers-${loserRound}-${loserPosition}`;
          match.nextLoseMatchId = matchMap[loserKey]?.id || null;
        }
      }
    }
  }
  
  /**
   * Generate the losers bracket portion
   */
  private static generateLosersBracket(
    bracketId: string,
    numFirstRoundMatches: number,
    matches: BracketMatch[],
    matchMap: Record<string, BracketMatch>
  ): void {
    const numRounds = Math.log2(numFirstRoundMatches) * 2;
    
    // Create all rounds in the losers bracket
    for (let round = 1; round <= numRounds; round++) {
      const isElimRound = round % 2 === 1;
      const matchesInRound = Math.pow(2, Math.floor((numRounds - round) / 2));
      
      for (let position = 1; position <= matchesInRound; position++) {
        const match: BracketMatch = {
          id: nanoid(),
          round,
          position,
          matchType: "losers",
          team1Id: null,
          team2Id: null,
          team1Seed: null,
          team2Seed: null,
          nextWinMatchId: null,
          nextLoseMatchId: null, // No next lose in losers bracket
          winnerId: null,
          bracket_id: bracketId
        };
        
        matches.push(match);
        
        // Store match in map for linking
        const key = `losers-${round}-${position}`;
        matchMap[key] = match;
        
        // Link winners to next round in losers bracket
        if (round < numRounds) {
          const nextPosition = Math.ceil(position / 2);
          const nextRound = round + 1;
          const nextKey = `losers-${nextRound}-${nextPosition}`;
          match.nextWinMatchId = matchMap[nextKey]?.id || null;
        } else if (round === numRounds) {
          // Final loser goes to final match
          match.nextWinMatchId = matchMap['finals-1']?.id || null;
        }
      }
    }
  }
  
  /**
   * Create the finals match
   */
  private static createFinalsMatch(
    bracketId: string,
    matches: BracketMatch[],
    matchMap: Record<string, BracketMatch>
  ): void {
    const finalsMatch: BracketMatch = {
      id: nanoid(),
      round: 1,
      position: 1,
      matchType: "finals",
      team1Id: null, // Winner of winners bracket
      team2Id: null, // Winner of losers bracket
      team1Seed: null,
      team2Seed: null,
      nextWinMatchId: null,
      nextLoseMatchId: null,
      winnerId: null,
      bracket_id: bracketId
    };
    
    matches.push(finalsMatch);
    matchMap['finals-1'] = finalsMatch;
  }
  
  /**
   * Link play-in matches to the first round of the winners bracket
   */
  private static linkPlayInMatches(matches: BracketMatch[]): void {
    const playInMatches = matches.filter(m => m.matchType === "play-in");
    const firstRoundMatches = matches.filter(m => m.matchType === "winners" && m.round === 1);
    
    playInMatches.forEach(playInMatch => {
      // Find first round match that has a placeholder team ID matching this play-in
      const targetMatch = firstRoundMatches.find(m => 
        m.team1Id === `play-in-${playInMatch.position}` || 
        m.team2Id === `play-in-${playInMatch.position}`
      );
      
      if (targetMatch) {
        playInMatch.nextWinMatchId = targetMatch.id;
      }
    });
  }

  /**
   * Save all matches to the database
   */
  static async saveBracketMatches(matches: BracketMatch[]): Promise<void> {
    // Convert to database format
    const dbMatches = matches.map(match => ({
      id: match.id,
      round_number: match.round,
      position: match.position,
      match_type: match.matchType,
      team1_id: match.team1Id,
      team2_id: match.team2Id,
      next_match_id: match.nextWinMatchId,
      next_loser_match_id: match.nextLoseMatchId,
      winner_id: match.winnerId,
      bracket_id: match.bracket_id,
      team1_seed: match.team1Seed,
      team2_seed: match.team2Seed,
    }));

    try {
      const { error } = await supabase
        .from('matches')
        .insert(dbMatches);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error saving bracket matches:', error);
      throw error;
    }
  }
  
  /**
   * Update a match with a winner and advance to next rounds
   */
  static async updateMatchResult(
    matchId: string, 
    winnerId: string, 
    team1Score: number, 
    team2Score: number
  ): Promise<void> {
    try {
      // Get the match to update
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();
      
      if (matchError) throw matchError;
      
      // Determine loser ID
      const loserId = match.team1_id === winnerId ? match.team2_id : match.team1_id;
      
      // Update the current match
      const { error: updateError } = await supabase
        .from('matches')
        .update({
          winner_id: winnerId,
          loser_id: loserId,
          team1_score: team1Score,
          team2_score: team2Score,
          iscompleted: true
        })
        .eq('id', matchId);
      
      if (updateError) throw updateError;
      
      // Advance winner to next winners match if it exists
      if (match.next_match_id) {
        await this.advanceTeamToNextMatch(match.next_match_id, winnerId, true);
      }
      
      // Advance loser to next losers match if it exists
      if (match.next_loser_match_id) {
        await this.advanceTeamToNextMatch(match.next_loser_match_id, loserId, false);
      }
    } catch (error) {
      console.error('Error updating match result:', error);
      throw error;
    }
  }
  
  /**
   * Advance a team to the next match
   */
  private static async advanceTeamToNextMatch(
    nextMatchId: string,
    teamId: string,
    isWinner: boolean
  ): Promise<void> {
    try {
      // Get the next match
      const { data: nextMatch, error: nextMatchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', nextMatchId)
        .single();
      
      if (nextMatchError) throw nextMatchError;
      
      // For simplicity, always assign to team1 if empty, otherwise team2
      // In a more complex implementation, you might want to consider seeding
      const updateData = !nextMatch.team1_id
        ? { team1_id: teamId }
        : { team2_id: teamId };
      
      const { error: updateError } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', nextMatchId);
      
      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error advancing team to next match:', error);
      throw error;
    }
  }
}
