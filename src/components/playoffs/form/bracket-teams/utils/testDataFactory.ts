/**
 * Test data factory functions for bracket form testing
 */

import { DivisionMappingResult, ProcessedTeam, Ranking } from '../types';

/**
 * Creates mock processed team data for testing
 * @param overrides - Optional overrides for team properties
 * @returns Mock ProcessedTeam object
 */
export const createMockTeam = (overrides: Partial<ProcessedTeam> = {}): ProcessedTeam => ({
  id: 'team-1',
  name: 'Test Team',
  logoUrl: null,
  imageUrl: null,
  seed: 1,
  powerScore: 1000,
  wins: 10,
  losses: 2,
  division_id: 'div-1',
  divisionName: 'Test Division',
  players: [],
  created_at: new Date().toISOString(),
  game_wins: 20,
  game_losses: 5,
  sos: 0.6,
  power_score: 1000,
  win_percentage: 0.83,
  game_win_percentage: 0.8,
  close_match_losses: 1,
  ...overrides,
});

/**
 * Creates an array of mock teams for testing
 * @param count - Number of teams to create
 * @returns Array of mock ProcessedTeam objects
 */
export const createMockTeams = (count: number): ProcessedTeam[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockTeam({
      id: `team-${index + 1}`,
      name: `Team ${index + 1}`,
      seed: index + 1,
      powerScore: 1000 - index * 10,
    })
  );
};

/**
 * Creates mock ranking data for testing
 * @param overrides - Optional overrides for ranking properties
 * @returns Mock Ranking object
 */
export const createMockRanking = (overrides: Partial<Ranking> = {}): Ranking => ({
  teamId: 'team-1',
  teamName: 'Test Team',
  powerScore: 1000,
  wins: 10,
  losses: 2,
  winPercentage: 0.83,
  gamesWon: 20,
  gamesLost: 5,
  gameWinPercentage: 0.8,
  sos: 0.6,
  divisionName: 'Test Division',
  closeMatchLosses: 1,
  ...overrides,
});

/**
 * Creates an array of mock rankings for testing
 * @param count - Number of rankings to create
 * @returns Array of mock Ranking objects
 */
export const createMockRankings = (count: number): Ranking[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockRanking({
      teamId: `team-${index + 1}`,
      teamName: `Team ${index + 1}`,
      powerScore: 1000 - index * 10,
    })
  );
};

/**
 * Creates mock division mapping for testing
 * @param divisions - Array of division names to create mappings for
 * @returns Mock DivisionMappingResult object
 */
export const createMockDivisionMapping = (
  divisions: string[] = ['Test Division']
): DivisionMappingResult => {
  const divisionMap = new Map<string, string>();
  divisions.forEach((name, index) => {
    divisionMap.set(name, `div-${index + 1}`);
  });

  return {
    divisionMap,
    mapDivisionName: (name: string) => divisionMap.get(name) || null,
  };
};

/**
 * Creates mock form validation state for testing
 * @param overrides - Optional overrides for validation state
 * @returns Mock validation state object
 */
export const createMockValidationState = (overrides: any = {}) => ({
  isValid: true,
  isComplete: true,
  hasError: false,
  hasWarning: false,
  errorMessage: null,
  warningMessage: null,
  statusMessage: 'All good',
  progress: {
    percentage: 100,
    selected: 4,
    required: 2,
    maximum: 16,
    available: 10,
  },
  ...overrides,
});
