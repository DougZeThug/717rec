import { errorLog, matchLog, warnLog } from '@/utils/logger';

export const validateMatchSubmission = (match: any) => {
  matchLog('DIAGNOSTIC: Starting match validation:', {
    matchId: match?.id || 'unknown',
    date: match?.date,
    dateType: match?.date ? typeof match.date : 'undefined',
    team1GameWins: match?.team1_game_wins,
    team1GameWinsValue: match?.team1_game_wins,
    team1GameWinsType: typeof match?.team1_game_wins,
    team1GameWinsIsNaN: isNaN(Number(match?.team1_game_wins)),
    team2GameWins: match?.team2_game_wins,
    team2GameWinsValue: match?.team2_game_wins,
    team2GameWinsType: typeof match?.team2_game_wins,
    team2GameWinsIsNaN: isNaN(Number(match?.team2_game_wins)),
    team1Score: match?.team1Score,
    team1ScoreType: typeof match?.team1Score,
    team2Score: match?.team2Score,
    team2ScoreType: typeof match?.team2Score,
    iscompleted: match?.iscompleted,
    isEdited: match?.isEdited,
    isValid: match?.isValid,
    fullMatch: JSON.stringify(match),
  });

  if (!match) {
    errorLog('Match validation failed: match object is missing');
    return { isValid: false, errorMessage: 'Match data is missing' };
  }

  if (match.iscompleted) {
    if (!match.team1Id || !match.team2Id) {
      errorLog('Match validation failed: missing team data', {
        team1Id: match.team1Id,
        team2Id: match.team2Id,
      });
      return { isValid: false, errorMessage: 'Missing team data' };
    }

    // Normalize game wins to numbers and check for NaN
    const team1GameWins = Number(match.team1_game_wins ?? 0);
    const team2GameWins = Number(match.team2_game_wins ?? 0);
    const team1ScoreNum = Number(match.team1Score);
    const team2ScoreNum = Number(match.team2Score);

    matchLog('DIAGNOSTIC: Match validation - after normalization:', {
      matchId: match.id,
      date: match.date,
      dateType: typeof match.date,
      team1GameWins,
      team2GameWins,
      team1GameWinsType: typeof team1GameWins,
      team2GameWinsType: typeof team2GameWins,
      team1ScoreNum,
      team2ScoreNum,
      isNaN: {
        team1GameWins: isNaN(team1GameWins),
        team2GameWins: isNaN(team2GameWins),
        team1ScoreNum: isNaN(team1ScoreNum),
        team2ScoreNum: isNaN(team2ScoreNum),
      },
    });

    // Check for NaN values which would indicate parsing problems
    if (isNaN(team1GameWins) || isNaN(team2GameWins)) {
      errorLog('Match validation failed: game wins cannot be parsed to numbers', {
        team1GameWins: match.team1_game_wins,
        team2GameWins: match.team2_game_wins,
        team1GameWinsType: typeof match.team1_game_wins,
        team2GameWinsType: typeof match.team2_game_wins,
      });
      return { isValid: false, errorMessage: 'Game wins must be numbers' };
    }

    if (isNaN(team1ScoreNum) || isNaN(team2ScoreNum)) {
      errorLog('Match validation failed: match scores cannot be parsed to numbers', {
        team1Score: match.team1Score,
        team2Score: match.team2Score,
        team1ScoreType: typeof match.team1Score,
        team2ScoreType: typeof match.team2Score,
      });
      return { isValid: false, errorMessage: 'Match scores must be numbers' };
    }

    // Allow 0-0 initially but warn
    if (team1GameWins === 0 && team2GameWins === 0) {
      warnLog('Completed match has zero game wins:', {
        matchId: match.id,
        date: match.date,
        dateType: typeof match.date,
      });
    }

    // Prevent ties except for 0-0
    if (team1GameWins === team2GameWins && team1GameWins !== 0) {
      errorLog('Match validation failed: tied game wins', {
        team1GameWins,
        team2GameWins,
        matchId: match.id,
        date: match.date,
      });
      return { isValid: false, errorMessage: 'Game wins cannot be tied' };
    }

    // Validate binary scores match game win results
    const team1Won = team1GameWins > team2GameWins;
    const expectedTeam1Score = team1Won ? 1 : 0;
    const expectedTeam2Score = team1Won ? 0 : 1;

    matchLog('DIAGNOSTIC: Expected scores vs actual:', {
      matchId: match.id,
      date: match.date,
      dateType: typeof match.date,
      team1Won,
      expectedTeam1Score,
      expectedTeam2Score,
      actualTeam1Score: team1ScoreNum,
      actualTeam2Score: team2ScoreNum,
    });

    if (team1ScoreNum !== expectedTeam1Score || team2ScoreNum !== expectedTeam2Score) {
      errorLog("Match validation failed: scores don't match game win results", {
        expected: `${expectedTeam1Score}-${expectedTeam2Score}`,
        actual: `${team1ScoreNum}-${team2ScoreNum}`,
        gameWins: `${team1GameWins}-${team2GameWins}`,
      });
      return {
        isValid: false,
        errorMessage: 'Match scores must match game win results',
      };
    }
  }

  matchLog('DIAGNOSTIC: Match validation passed for match:', {
    id: match.id,
    date: match.date,
    dateType: typeof match.date,
  });
  return { isValid: true };
};
