
import { ProcessedTeam, BracketFormTeamsProps } from '../types';
import { Division } from '@/types';

/**
 * Factory functions for creating test data
 */
export const testDataFactory = {
  /**
   * Creates a basic team for testing
   */
  createTeam: (overrides: Partial<ProcessedTeam> = {}): ProcessedTeam => ({
    id: `team-${Math.random().toString(36).substr(2, 9)}`,
    name: `Test Team ${Math.floor(Math.random() * 1000)}`,
    logoUrl: null,
    imageUrl: null,
    seed: 1,
    powerScore: 1000,
    wins: 10,
    losses: 5,
    division_id: 'div-1',
    divisionName: 'Test Division',
    players: [],
    created_at: new Date().toISOString(),
    game_wins: 20,
    game_losses: 15,
    sos: 0.5,
    power_score: 1000,
    win_percentage: 0.67,
    game_win_percentage: 0.57,
    close_match_losses: 2,
    ...overrides
  }),

  /**
   * Creates multiple teams for testing
   */
  createTeams: (count: number, divisionId?: string): ProcessedTeam[] => {
    return Array.from({ length: count }, (_, index) =>
      testDataFactory.createTeam({
        seed: index + 1,
        name: `Team ${index + 1}`,
        division_id: divisionId || `div-${(index % 3) + 1}`,
        powerScore: 1000 - (index * 10)
      })
    );
  },

  /**
   * Creates test divisions
   */
  createDivisions: (count: number = 3): Division[] => {
    return Array.from({ length: count }, (_, index) => ({
      id: `div-${index + 1}`,
      name: `Division ${String.fromCharCode(65 + index)}` // A, B, C, etc.
    }));
  },

  /**
   * Creates complete props for testing
   */
  createProps: (overrides: Partial<BracketFormTeamsProps> = {}): BracketFormTeamsProps => ({
    divisionId: 'div-1',
    maxTeams: 16,
    onChange: () => {},
    divisions: testDataFactory.createDivisions(),
    ...overrides
  }),

  /**
   * Creates edge case scenarios for testing
   */
  createEdgeCases: () => ({
    emptyProps: {
      divisionId: null,
      maxTeams: 0,
      onChange: () => {},
      divisions: []
    },
    largeDataset: {
      divisionId: 'div-large',
      maxTeams: 64,
      onChange: () => {},
      divisions: testDataFactory.createDivisions(10)
    },
    singleTeam: {
      divisionId: 'div-1',
      maxTeams: 1,
      onChange: () => {},
      divisions: testDataFactory.createDivisions(1)
    }
  })
};
