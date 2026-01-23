import { createEmptyDivisionRecord, categorizeDivision } from './calculateSeasonStats';

interface MatchProcessingResult {
  sweeps: number;
  closeWins: number;
  closeLosses: number;
  divisionRecords: {
    competitive: { wins: number; losses: number; gameWins: number; gameLosses: number };
    intermediate: { wins: number; losses: number; gameWins: number; gameLosses: number };
    recreational: { wins: number; losses: number; gameWins: number; gameLosses: number };
  };
  playoffWins: number;
  playoffLosses: number;
}

interface ArchivedMatch {
  winner_id: string | null;
  loser_id: string | null;
  team1_game_wins: number | null;
  team2_game_wins: number | null;
  team1_id: string | null;
  team2_id: string | null;
  season_id: string | null;
}

interface PlayoffMatch {
  winner_id: string | null;
  loser_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  team1_id: string | null;
  team2_id: string | null;
  bracket_id: string | null;
  bracketInfo: {
    season_id: string;
    division_weight: number;
  } | null;
}

export const processSeasonMatches = (
  teamId: string,
  seasonId: string,
  seasonMatches: ArchivedMatch[],
  seasonPlayoffMatches: PlayoffMatch[],
  teamDivisionMap: Map<string, string>
): MatchProcessingResult => {
  let sweeps = 0;
  let closeWins = 0;
  let closeLosses = 0;

  const divisionRecords = {
    competitive: createEmptyDivisionRecord(),
    intermediate: createEmptyDivisionRecord(),
    recreational: createEmptyDivisionRecord(),
  };

  // Process regular season matches
  for (const match of seasonMatches) {
    const isTeam1 = match.team1_id === teamId;
    const teamGameWins = isTeam1 ? match.team1_game_wins || 0 : match.team2_game_wins || 0;
    const opponentGameWins = isTeam1 ? match.team2_game_wins || 0 : match.team1_game_wins || 0;
    const isWinner = match.winner_id === teamId;

    // Sweep/close match detection
    if (isWinner) {
      if (teamGameWins === 2 && opponentGameWins === 0) {
        sweeps++;
      } else if (teamGameWins === 2 && opponentGameWins === 1) {
        closeWins++;
      }
    } else if (match.loser_id === teamId) {
      if (opponentGameWins === 2 && teamGameWins === 1) {
        closeLosses++;
      }
    }

    // Division record for this match
    const opponentId = isTeam1 ? match.team2_id : match.team1_id;
    if (opponentId) {
      const opponentDivision = teamDivisionMap.get(`${opponentId}_${seasonId}`);
      const tier = categorizeDivision(opponentDivision || null);
      if (tier) {
        if (isWinner) {
          divisionRecords[tier].wins++;
          divisionRecords[tier].gameWins += teamGameWins;
          divisionRecords[tier].gameLosses += opponentGameWins;
        } else if (match.loser_id === teamId) {
          divisionRecords[tier].losses++;
          divisionRecords[tier].gameWins += teamGameWins;
          divisionRecords[tier].gameLosses += opponentGameWins;
        }
      }
    }
  }

  // Process playoff matches
  let playoffWins = 0;
  let playoffLosses = 0;

  for (const match of seasonPlayoffMatches) {
    const isTeam1 = match.team1_id === teamId;
    const teamScore = isTeam1 ? match.team1_score || 0 : match.team2_score || 0;
    const opponentScore = isTeam1 ? match.team2_score || 0 : match.team1_score || 0;
    const isWinner = match.winner_id === teamId;

    if (isWinner) {
      playoffWins++;
      if (teamScore === 2 && opponentScore === 0) {
        sweeps++;
      } else if (teamScore === 2 && opponentScore === 1) {
        closeWins++;
      }
    } else if (match.loser_id === teamId) {
      playoffLosses++;
      if (opponentScore === 2 && teamScore === 1) {
        closeLosses++;
      }
    }

    // Playoff division record based on bracket division
    const bracketWeight = match.bracketInfo?.division_weight || 0.85;
    let tier: 'competitive' | 'intermediate' | 'recreational';
    if (bracketWeight >= 0.89) tier = 'competitive';
    else if (bracketWeight >= 0.4) tier = 'intermediate';
    else tier = 'recreational';

    if (isWinner) {
      divisionRecords[tier].wins++;
      divisionRecords[tier].gameWins += teamScore;
      divisionRecords[tier].gameLosses += opponentScore;
    } else if (match.loser_id === teamId) {
      divisionRecords[tier].losses++;
      divisionRecords[tier].gameWins += teamScore;
      divisionRecords[tier].gameLosses += opponentScore;
    }
  }

  return {
    sweeps,
    closeWins,
    closeLosses,
    divisionRecords,
    playoffWins,
    playoffLosses,
  };
};
