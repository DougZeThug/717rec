
/**
 * Utility class for converting match formats between brackets-manager and our database
 */
export class MatchConverterUtils {
  /**
   * Guard against literal "undefined" strings and other invalid values
   * @private
   */
  private nil(id?: string | null): string | null {
    return !id || id === 'undefined' || id === '' ? null : id;
  }

  /**
   * Convert a match from brackets-manager format to database format
   */
  convertMatchToDbFormat(match: any): any {
    if (!match || !match.id) {
      console.error("Invalid match object:", match);
      throw new Error("Cannot convert invalid match to database format");
    }
    
    // Ensure stage_id exists and is valid
    if (!match.stage_id || match.stage_id === 'undefined') {
      console.error("Match is missing stage_id:", match);
      throw new Error("Match is missing required stage_id");
    }
    
    console.log(`Converting match to DB format: id=${match.id}, stage=${match.stage_id}`);
    
    const dbMatch = {
      id: match.id,
      bracket_id: match.stage_id,
      round_number: match.round || 0,
      position: match.position || 0,
      match_type: this.convertMatchTypeForDB(match.group?.toLowerCase() || 'winners'),
      team1_id: this.validateId(match.opponent1?.id),
      team2_id: this.validateId(match.opponent2?.id),
      winner_id: match.opponent1?.result === 'win' 
        ? this.validateId(match.opponent1.id) 
        : (match.opponent2?.result === 'win' ? this.validateId(match.opponent2.id) : null),
      loser_id: match.opponent1?.result === 'loss'
        ? this.validateId(match.opponent1.id)
        : (match.opponent2?.result === 'loss' ? this.validateId(match.opponent2.id) : null),
      next_match_id: this.nil(match.child_match_id),
      next_loser_match_id: this.nil(match.child_match_id_loser),
      best_of: match.best_of || 3,
      team1_score: match.opponent1?.score !== undefined ? match.opponent1.score : null,
      team2_score: match.opponent2?.score !== undefined ? match.opponent2.score : null,
      iscompleted: match.status === 'completed',
      metadata: {
        team1_seed: match.opponent1?.position || null,
        team2_seed: match.opponent2?.position || null
      }
    };
    
    // Debug log
    console.log(`Match converted to DB format: ${dbMatch.id}, bracket=${dbMatch.bracket_id}, type=${dbMatch.match_type}`);
    
    return dbMatch;
  }
  
  /**
   * Convert a match from database format to brackets-manager format
   */
  convertMatchFromDbFormat(dbMatch: any): any {
    if (!dbMatch || !dbMatch.id) {
      console.error("Invalid DB match object:", dbMatch);
      throw new Error("Cannot convert invalid DB match to brackets-manager format");
    }
    
    // Ensure bracket_id exists and is valid
    if (!dbMatch.bracket_id || dbMatch.bracket_id === 'undefined') {
      console.error("DB match is missing bracket_id:", dbMatch);
      throw new Error("DB match is missing required bracket_id");
    }
    
    console.log(`Converting DB match to brackets-manager format: id=${dbMatch.id}, bracket=${dbMatch.bracket_id}`);
    
    // Handle opponent1
    const opponent1 = dbMatch.team1_id ? {
      id: dbMatch.team1_id,
      position: dbMatch.metadata?.team1_seed || null,
      result: dbMatch.team1_id === dbMatch.winner_id ? 'win' : 
              (dbMatch.team1_id === dbMatch.loser_id ? 'loss' : null),
      score: dbMatch.team1_score
    } : null;
    
    // Handle opponent2
    const opponent2 = dbMatch.team2_id ? {
      id: dbMatch.team2_id,
      position: dbMatch.metadata?.team2_seed || null,
      result: dbMatch.team2_id === dbMatch.winner_id ? 'win' : 
              (dbMatch.team2_id === dbMatch.loser_id ? 'loss' : null),
      score: dbMatch.team2_score
    } : null;
    
    // Calculate child_count based on next match links
    const childCount = (dbMatch.next_match_id ? 1 : 0) + (dbMatch.next_loser_match_id ? 1 : 0);
    
    const bracketMatch = {
      id: dbMatch.id,
      stage_id: dbMatch.bracket_id,
      round: dbMatch.round_number,
      position: dbMatch.position,
      group: this.convertMatchTypeFromDB(dbMatch.match_type).toUpperCase(),
      status: dbMatch.iscompleted ? 'completed' : 'pending',
      opponent1: opponent1,
      opponent2: opponent2,
      child_count: childCount,
      child_match_id: this.nil(dbMatch.next_match_id),
      child_match_id_loser: this.nil(dbMatch.next_loser_match_id),
      best_of: dbMatch.best_of
    };
    
    // Debug log
    console.log(`DB match converted to brackets-manager format: ${bracketMatch.id}, stage=${bracketMatch.stage_id}`);
    
    return bracketMatch;
  }

  /**
   * Validate an ID to ensure it's not 'undefined', undefined, or empty string
   * Returns null if invalid, otherwise returns the original ID
   */
  private validateId(id: any): string | null {
    if (!id || id === 'undefined' || id === '') {
      return null;
    }
    return id;
  }

  /**
   * Convert match type for database compatibility
   * Maps play-in and play-in-2 to winners for database storage
   */
  convertMatchTypeForDB(matchType: string): "winners" | "losers" | "finals" {
    if (!matchType) {
      console.warn("No match type provided, defaulting to winners");
      return "winners";
    }
    
    if (matchType === "play-in" || matchType === "play-in-2") {
      return "winners";
    }
    
    if (matchType !== "winners" && matchType !== "losers" && matchType !== "finals") {
      console.warn(`Unknown match type: ${matchType}, defaulting to winners`);
      return "winners";
    }
    
    return matchType as "winners" | "losers" | "finals";
  }
  
  /**
   * Convert match type from database format to brackets-manager format
   * For now, this is simple, but can be extended if needed
   */
  convertMatchTypeFromDB(matchType: string): string {
    if (!matchType) {
      console.warn("No match type provided from DB, defaulting to winners");
      return "winners";
    }
    
    return matchType;
  }
}
