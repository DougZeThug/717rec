
export const validateMatchSubmission = (match: any) => {
  console.log("🔍 DIAGNOSTIC: Validating match submission:", {
    matchId: match?.id,
    date: match?.date,
    dateType: match?.date ? typeof match.date : 'undefined',
    team1GameWins: match?.team1_game_wins,
    team1GameWinsType: typeof match?.team1_game_wins,
    team2GameWins: match?.team2_game_wins,
    team2GameWinsType: typeof match?.team2_game_wins,
    team1Score: match?.team1Score,
    team2Score: match?.team2Score,
    iscompleted: match?.iscompleted,
    fullMatch: JSON.stringify(match)
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

    console.log("🔍 DIAGNOSTIC: Match validation - game wins after normalization:", { 
      matchId: match.id,
      date: match.date, 
      team1GameWins, 
      team2GameWins,
      team1GameWinsType: typeof team1GameWins,
      team2GameWinsType: typeof team2GameWins
    });
    
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

    console.log("🔍 DIAGNOSTIC: Expected scores:", {
      matchId: match.id,
      date: match.date,
      team1Won,
      expectedTeam1Score,
      expectedTeam2Score,
      actualTeam1Score: match.team1Score,
      actualTeam2Score: match.team2Score
    });

    if (match.team1Score !== expectedTeam1Score || match.team2Score !== expectedTeam2Score) {
      return { 
        isValid: false, 
        errorMessage: "Match scores must match game win results" 
      };
    }
  }

  console.log("🔍 DIAGNOSTIC: Match validation passed for match:", {
    id: match.id,
    date: match.date
  });
  return { isValid: true };
};
