import { Team } from '@/types';
import { TeamPair, TimeBlockTeamsMap } from '@/types/autoSchedule';

/**
 * Create a mock team
 */
export function createMockTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    name: 'Mock Team',
    logoUrl: '/logo.png',
    wins: 5,
    losses: 2,
    game_wins: 15,
    game_losses: 6,
    sos: 0.6,
    power_score: 75,
    ...overrides,
  } as Team;
}

/**
 * Create a mock time block teams map
 */
export function createMockTimeBlockTeams(
  counts: Record<string, number> = { '6:30': 2, '7:30': 2, '8:30': 2 }
): TimeBlockTeamsMap {
  const result: TimeBlockTeamsMap = {};

  Object.entries(counts).forEach(([block, count]) => {
    result[block] = Array(count)
      .fill(null)
      .map((_, i) =>
        createMockTeam({
          id: `team-${block}-${i + 1}`,
          name: `Team ${block}-${i + 1}`,
        })
      );
  });

  return result;
}

/**
 * Create a mock team pairing
 */
export function createMockTeamPairing(overrides: Partial<TeamPair> = {}): TeamPair {
  return {
    team1: createMockTeam({ id: 'team-1', name: 'Team 1' }),
    team2: createMockTeam({ id: 'team-2', name: 'Team 2' }),
    compatibilityScore: 8.5,
    hasPlayedBefore: false,
    ...overrides,
  };
}
