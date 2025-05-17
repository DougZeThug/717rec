
import { ScoreOption } from "../types";

export const generateScoreOptions = (team1Id: string | undefined, team2Id: string | undefined): ScoreOption[] => {
  // For a best of 3 match, we have 4 possible outcomes: 2-0, 2-1, 1-2, 0-2
  return [
    { team1GameWins: 2, team2GameWins: 0, label: "2-0", winner: "team1" },
    { team1GameWins: 2, team2GameWins: 1, label: "2-1", winner: "team1" },
    { team1GameWins: 1, team2GameWins: 2, label: "1-2", winner: "team2" },
    { team1GameWins: 0, team2GameWins: 2, label: "0-2", winner: "team2" },
  ];
};

export const generateGameData = (option: ScoreOption): { team1Score: number; team2Score: number }[] => {
  const games: { team1Score: number; team2Score: number }[] = [];
      
  // For 2-0 or 0-2, we create two games with clear victories
  if (option.team1GameWins === 2 && option.team2GameWins === 0) {
    games.push({ team1Score: 21, team2Score: 15 });
    games.push({ team1Score: 21, team2Score: 16 });
  } 
  // For 0-2, team2 wins both games
  else if (option.team1GameWins === 0 && option.team2GameWins === 2) {
    games.push({ team1Score: 15, team2Score: 21 });
    games.push({ team1Score: 16, team2Score: 21 });
  }
  // For 2-1, team1 wins two, loses one
  else if (option.team1GameWins === 2 && option.team2GameWins === 1) {
    games.push({ team1Score: 21, team2Score: 17 });
    games.push({ team1Score: 18, team2Score: 21 });
    games.push({ team1Score: 21, team2Score: 15 });
  }
  // For 1-2, team1 wins one, loses two
  else if (option.team1GameWins === 1 && option.team2GameWins === 2) {
    games.push({ team1Score: 21, team2Score: 17 });
    games.push({ team1Score: 18, team2Score: 21 });
    games.push({ team1Score: 15, team2Score: 21 });
  }
  
  return games;
};
