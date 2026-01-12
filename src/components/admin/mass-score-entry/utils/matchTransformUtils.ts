import { transformDatabaseMatch } from '@/utils/matchTransformers';

import { MatchWithTeams } from '../types';

export const transformDatabaseMatchToMatchWithTeams = (match: any): MatchWithTeams => {
  // Use centralized transformer for base match fields
  const baseMatch = transformDatabaseMatch(match);

  // Ensure game wins are properly parsed as numbers
  const team1GameWins =
    typeof match.team1_game_wins === 'number'
      ? match.team1_game_wins
      : parseInt(String(match.team1_game_wins || 0));

  const team2GameWins =
    typeof match.team2_game_wins === 'number'
      ? match.team2_game_wins
      : parseInt(String(match.team2_game_wins || 0));

  return {
    ...baseMatch,
    team1_game_wins: team1GameWins,
    team2_game_wins: team2GameWins,
    team1: match.team1
      ? {
          id: match.team1.id,
          name: match.team1.name,
          logoUrl: match.team1.logo_url || match.team1.image_url,
          imageUrl: match.team1.image_url,
          players: [],
          wins: 0,
          losses: 0,
          game_wins: 0,
          game_losses: 0,
          created_at: '',
          sos: 0.5,
          power_score: 0,
          win_percentage: 0,
          game_win_percentage: 0,
        }
      : undefined,
    team2: match.team2
      ? {
          id: match.team2.id,
          name: match.team2.name,
          logoUrl: match.team2.logo_url || match.team2.image_url,
          imageUrl: match.team2.image_url,
          players: [],
          wins: 0,
          losses: 0,
          game_wins: 0,
          game_losses: 0,
          created_at: '',
          sos: 0.5,
          power_score: 0,
          win_percentage: 0,
          game_win_percentage: 0,
        }
      : undefined,
    isEdited: false,
    isValid: true,
  };
};
