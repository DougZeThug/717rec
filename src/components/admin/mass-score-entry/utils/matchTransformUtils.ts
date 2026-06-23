import { transformDatabaseMatch } from '@/utils/matchTransformers';

import { MatchWithTeams } from '../types';

type DatabaseMatchTransformInput = Parameters<typeof transformDatabaseMatch>[0];
type MatchTeamJoin =
  NonNullable<DatabaseMatchTransformInput['team1']> extends Array<infer T>
    ? T
    : NonNullable<DatabaseMatchTransformInput['team1']>;

type MassScoreDatabaseMatch = Omit<
  DatabaseMatchTransformInput,
  'team1_game_wins' | 'team2_game_wins' | 'team1' | 'team2'
> & {
  team1_game_wins?: number | string | null;
  team2_game_wins?: number | string | null;
  team1?: MatchTeamJoin | null;
  team2?: MatchTeamJoin | null;
};

export const transformDatabaseMatchToMatchWithTeams = (
  match: MassScoreDatabaseMatch
): MatchWithTeams => {
  // Ensure game wins are properly parsed as numbers
  const team1GameWins =
    typeof match.team1_game_wins === 'number'
      ? match.team1_game_wins
      : parseInt(String(match.team1_game_wins || 0));

  const team2GameWins =
    typeof match.team2_game_wins === 'number'
      ? match.team2_game_wins
      : parseInt(String(match.team2_game_wins || 0));

  // Normalize game wins to the shape expected by the centralized transformer
  const baseMatch = transformDatabaseMatch({
    ...match,
    team1_game_wins: team1GameWins,
    team2_game_wins: team2GameWins,
  } as DatabaseMatchTransformInput);

  // The team join may arrive as a single object or an array; normalize to one object
  const team1 = Array.isArray(match.team1) ? match.team1[0] : match.team1;
  const team2 = Array.isArray(match.team2) ? match.team2[0] : match.team2;

  return {
    ...baseMatch,
    team1_game_wins: team1GameWins,
    team2_game_wins: team2GameWins,
    team1: team1
      ? {
          id: team1.id ?? '',
          name: team1.name ?? '',
          logoUrl: team1.image_url || team1.logo_url || undefined,
          imageUrl: team1.image_url ?? undefined,
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
    team2: team2
      ? {
          id: team2.id ?? '',
          name: team2.name ?? '',
          logoUrl: team2.image_url || team2.logo_url || undefined,
          imageUrl: team2.image_url ?? undefined,
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
