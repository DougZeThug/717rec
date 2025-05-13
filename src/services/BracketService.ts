import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

interface BracketCreationParams {
  title: string;
  divisionId: string;
  format: 'Single Elimination' | 'Double Elimination';
  teamIds: string[];
  challongeTournamentId?: string | null;
  challongeTournamentUrl?: string | null;
}

/**
 * Service for managing playoff brackets
 */
export class BracketService {
  /**
   * Creates a new bracket with initial matches
   */
  static async createBracket(params: BracketCreationParams): Promise<string> {
    const { title, divisionId, format, teamIds, challongeTournamentId, challongeTournamentUrl } = params;
    
    // Create the bracket
    const { data: bracketData, error: bracketError } = await supabase
      .from('brackets')
      .insert({
        title,
        division_id: divisionId,
        format,
        challonge_tournament_id: challongeTournamentId,
        challonge_tournament_url: challongeTournamentUrl
      })
      .select()
      .single();
      
    if (bracketError) throw bracketError;
    
    const bracketId = bracketData.id;
    
    // Generate matches based on format and teams
    if (format === 'Single Elimination') {
      await this.generateSingleEliminationMatches(bracketId, teamIds);
    } else if (format === 'Double Elimination') {
      await this.generateDoubleEliminationMatches(bracketId, teamIds);
    }
    
    return bracketId;
  }
  
  /**
   * Generates matches for a single elimination bracket
   */
  private static async generateSingleEliminationMatches(bracketId: string, teamIds: string[]): Promise<void> {
    const numTeams = teamIds.length;
    const numRounds = Math.ceil(Math.log2(numTeams));
    const totalMatches = Math.pow(2, numRounds) - 1;
    
    // Create array of match objects to insert
    const matches = [];
    
    // First round matches - pair teams
    const firstRoundMatchCount = Math.floor(numTeams / 2);
    for (let i = 0; i < firstRoundMatchCount; i++) {
      matches.push({
        bracket_id: bracketId,
        round_number: 1,
        position: i + 1,
        team1_id: teamIds[i * 2],
        team2_id: teamIds[i * 2 + 1],
        match_type: 'winners'
      });
    }
    
    // Add bye matches if needed
    if (numTeams % 2 !== 0) {
      matches.push({
        bracket_id: bracketId,
        round_number: 1,
        position: firstRoundMatchCount + 1,
        team1_id: teamIds[teamIds.length - 1],
        team2_id: null, // Bye
        match_type: 'winners'
      });
    }
    
    // Create later round matches (empty)
    for (let round = 2; round <= numRounds; round++) {
      const roundMatchCount = Math.pow(2, numRounds - round);
      for (let i = 0; i < roundMatchCount; i++) {
        matches.push({
          bracket_id: bracketId,
          round_number: round,
          position: i + 1,
          team1_id: null,
          team2_id: null,
          match_type: 'winners'
        });
      }
    }
    
    // Insert all matches
    const { error } = await supabase.from('matches').insert(matches);
    if (error) throw error;
  }
  
  /**
   * Generates matches for a double elimination bracket
   */
  private static async generateDoubleEliminationMatches(bracketId: string, teamIds: string[]): Promise<void> {
    const numTeams = teamIds.length;
    const winnersRounds = Math.ceil(Math.log2(numTeams));
    
    // Create array of match objects to insert
    const matches = [];
    
    // WINNERS BRACKET
    
    // First round matches - pair teams
    const firstRoundMatchCount = Math.floor(numTeams / 2);
    for (let i = 0; i < firstRoundMatchCount; i++) {
      matches.push({
        bracket_id: bracketId,
        round_number: 1,
        position: i + 1,
        team1_id: teamIds[i * 2],
        team2_id: teamIds[i * 2 + 1],
        match_type: 'winners'
      });
    }
    
    // Add bye matches if needed
    if (numTeams % 2 !== 0) {
      matches.push({
        bracket_id: bracketId,
        round_number: 1,
        position: firstRoundMatchCount + 1,
        team1_id: teamIds[teamIds.length - 1],
        team2_id: null, // Bye
        match_type: 'winners'
      });
    }
    
    // Create later winner rounds (empty)
    for (let round = 2; round <= winnersRounds; round++) {
      const roundMatchCount = Math.pow(2, winnersRounds - round);
      for (let i = 0; i < roundMatchCount; i++) {
        matches.push({
          bracket_id: bracketId,
          round_number: round,
          position: i + 1,
          team1_id: null,
          team2_id: null,
          match_type: 'winners'
        });
      }
    }
    
    // LOSERS BRACKET
    // In a double elimination, losers bracket has more complex structure
    // This is a simplified version
    
    // For each winner round except finals, create corresponding loser rounds
    for (let round = 1; round < winnersRounds; round++) {
      const losersRoundMatchCount = Math.pow(2, winnersRounds - round - 1);
      for (let i = 0; i < losersRoundMatchCount; i++) {
        matches.push({
          bracket_id: bracketId,
          round_number: round,
          position: i + 1,
          team1_id: null, // Will be filled by losers from winners bracket
          team2_id: null,
          match_type: 'losers'
        });
      }
    }
    
    // FINALS
    // Add grand finals match
    matches.push({
      bracket_id: bracketId,
      round_number: winnersRounds + 1,
      position: 1,
      team1_id: null, // Winner of winners bracket
      team2_id: null, // Winner of losers bracket
      match_type: 'finals'
    });
    
    // Insert all matches
    const { error } = await supabase.from('matches').insert(matches);
    if (error) throw error;
  }
  
  /**
   * Updates a match with new scores
   */
  static async updateMatchScores(
    matchId: string, 
    team1Score: number, 
    team2Score: number,
    games: { team1Score: number, team2Score: number }[],
    challongeMatchId?: string
  ): Promise<void> {
    // Get the match first
    const { data: match, error: fetchError } = await supabase
      .from('matches')
      .select('team1_id, team2_id')
      .eq('id', matchId)
      .single();
      
    if (fetchError) throw fetchError;
    
    // Determine winner
    let winnerId = null;
    if (team1Score > team2Score) {
      winnerId = match.team1_id;
    } else if (team2Score > team1Score) {
      winnerId = match.team2_id;
    }
    
    // Update the match
    const { error: updateError } = await supabase
      .from('matches')
      .update({ 
        winner_id: winnerId,
        team1_score: team1Score,
        team2_score: team2Score,
        team1_game_wins: games.filter(game => game.team1Score > game.team2Score).length,
        team2_game_wins: games.filter(game => game.team2Score > game.team1Score).length
      })
      .eq('id', matchId);
      
    if (updateError) throw updateError;
    
    // Delete existing games for this match
    await supabase
      .from('games')
      .delete()
      .eq('match_id', matchId);
    
    // Insert new games
    if (games.length > 0) {
      const gameRecords = games.map((game, index) => ({
        match_id: matchId,
        game_number: index + 1,
        team1_score: game.team1Score,
        team2_score: game.team2Score
      }));
      
      const { error: gamesError } = await supabase
        .from('games')
        .insert(gameRecords);
        
      if (gamesError) throw gamesError;
    }
    
    // Update next matches if winner is determined
    if (winnerId) {
      await this.advanceTeamToNextMatch(matchId, winnerId);
    }
  }
  
  /**
   * Advances a team to the next match after they win
   */
  private static async advanceTeamToNextMatch(matchId: string, winnerId: string): Promise<void> {
    // Get the current match to find the next match
    try {
      const { data: currentMatch, error: matchError } = await supabase
        .from('matches')
        .select('bracket_id, round_number, position, match_type')
        .eq('id', matchId)
        .single();
        
      if (matchError) throw matchError;
      
      // Find the next match based on the current match's position
      // This is a simplified approach and would need to be more sophisticated in a real app
      
      // If it's a winners match, find the next winners match
      if (currentMatch.match_type === 'winners') {
        const nextRound = currentMatch.round_number + 1;
        const nextPosition = Math.ceil(currentMatch.position / 2);
        
        const { data: nextMatches, error: nextMatchError } = await supabase
          .from('matches')
          .select('id, team1_id, team2_id')
          .eq('bracket_id', currentMatch.bracket_id)
          .eq('round_number', nextRound)
          .eq('position', nextPosition)
          .eq('match_type', 'winners');
          
        if (nextMatchError) throw nextMatchError;
        
        if (nextMatches && nextMatches.length > 0) {
          const nextMatch = nextMatches[0];
          
          // Update the appropriate team slot
          const isEvenPosition = currentMatch.position % 2 === 0;
          const updateData = isEvenPosition 
            ? { team2_id: winnerId } 
            : { team1_id: winnerId };
            
          await supabase
            .from('matches')
            .update(updateData)
            .eq('id', nextMatch.id);
        }
      }
      
      // Similar logic for losers bracket and finals
      // Omitted for brevity
    } catch (error) {
      console.error("Error advancing team to next match:", error);
      throw error;
    }
  }
}
