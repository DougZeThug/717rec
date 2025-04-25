
export const validateMatchSubmission = (match: any) => {
  console.log("Validating match submission:", {
    matchId: match?.id,
    date: match?.date,
    team1GameWins: match?.team1_game_wins,
    team2GameWins: match?.team2_game_wins,
    iscompleted: match?.iscompleted
  });
  
  if (!match) {
    return { isValid: false, errorMessage: "Match data is missing" };
  }

  if (match.iscompleted) {
    if (!match.team1Id || !match.team2Id) {
      console.log("Match validation failed: missing team data");
      return { isValid: false, errorMessage: "Missing team data" };
    }

    // Normalize game wins to numbers
    const team1GameWins = Number(match.team1_game_wins ?? 0);
    const team2GameWins = Number(match.team2_game_wins ?? 0);

    console.log("Match validation - game wins:", { team1GameWins, team2GameWins });
    
    // Allow 0-0 initially but warn
    if (team1GameWins === 0 && team2GameWins === 0) {
      console.warn("⚠️ Completed match has zero game wins:", match.id);
    }

    // Prevent ties except for 0-0
    if (team1GameWins === team2GameWins && team1GameWins !== 0) {
      console.log("Match validation failed: tied game wins");
      return { isValid: false, errorMessage: "Game wins cannot be tied" };
    }

    // Validate binary scores match game win results
    const team1Won = team1GameWins > team2GameWins;
    const expectedTeam1Score = team1Won ? 1 : 0;
    const expectedTeam2Score = team1Won ? 0 : 1;

    if (match.team1Score !== expectedTeam1Score || match.team2Score !== expectedTeam2Score) {
      return { 
        isValid: false, 
        errorMessage: "Match scores must match game win results" 
      };
    }
  }

  console.log("Match validation passed for match:", match.id);
  return { isValid: true };
};
