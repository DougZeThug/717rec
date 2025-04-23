
export const validateMatchSubmission = (match: any) => {
  // Basic validation that we have a match object
  if (!match) {
    return { isValid: false, errorMessage: "Match data is missing" };
  }

  // If match is marked as completed, validate scores and game wins
  if (match.iscompleted) {
    // Check that we have team IDs
    if (!match.team1Id || !match.team2Id) {
      return { isValid: false, errorMessage: "Missing team data" };
    }

    // Parse game wins as integers or default to 0
    const team1GameWins = Number.isInteger(match.team1_game_wins) ? 
      match.team1_game_wins : 
      parseInt(String(match.team1_game_wins)) || 0;
    const team2GameWins = Number.isInteger(match.team2_game_wins) ? 
      match.team2_game_wins : 
      parseInt(String(match.team2_game_wins)) || 0;

    // Warn if a completed match has zero game wins
    if (team1GameWins === 0 && team2GameWins === 0) {
      console.warn("⚠️ Completed match has zero game wins:", match.id);
    }

    // Validate that scores aren't tied
    if (team1GameWins === team2GameWins) {
      return { isValid: false, errorMessage: "Game wins cannot be tied" };
    }

    // Check consistency between binary scores and game wins
    const expectedTeam1Score = team1GameWins > team2GameWins ? 1 : 0;
    const expectedTeam2Score = team2GameWins > team1GameWins ? 1 : 0;

    if (match.team1Score !== expectedTeam1Score || match.team2Score !== expectedTeam2Score) {
      return { 
        isValid: false, 
        errorMessage: "Match scores must match game win results" 
      };
    }
  }

  return { isValid: true };
};
