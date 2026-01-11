import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BracketCreationService } from '../src/services/brackets/services/BracketCreationService';
import { insertedRows, isValidUUID, resetInsertedRows } from './__mocks__/supabase';

// Mock the brackets-manager
vi.mock('../src/services/brackets/manager/BracketManager', () => ({
  bracketManager: {
    registerParticipants: vi.fn().mockResolvedValue(undefined),
    createStage: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock the supabase client
vi.mock('@/integrations/supabase/client', async () => {
  const { supabase } = await import('./__mocks__/supabase');
  return { supabase };
});

describe('Bracket Creation Safety Tests', () => {
  // Generate test UUIDs
  const divisionId = uuidv4();
  const teamIds = Array.from({ length: 12 }, () => uuidv4());

  beforeEach(() => {
    // Reset mock state
    resetInsertedRows();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Additional cleanup if needed
  });

  it('should ensure all foreign keys are valid UUIDs or null, never "undefined"', async () => {
    // Arrange - 12 teams and a division
    const bracketName = 'Test Bracket';
    const bracketFormat = 'Double Elimination';

    // Act - Create the bracket
    await BracketCreationService.createBracket(bracketFormat, bracketName, divisionId, teamIds);

    // Assert - Check brackets table
    expect(insertedRows).toHaveProperty('brackets');
    expect(insertedRows['brackets'].length).toBeGreaterThan(0);

    const bracketInsert = insertedRows['brackets'][0];
    expect(bracketInsert).toHaveProperty('division_id');
    expect(bracketInsert.division_id).toBe(divisionId);

    // Check that no "undefined" strings exist in bracket record
    Object.entries(bracketInsert).forEach(([key, value]) => {
      if (typeof value === 'string') {
        expect(value).not.toBe('undefined');
      }
    });

    // Check for playoff_matches if they were inserted
    if (insertedRows['playoff_matches']) {
      insertedRows['playoff_matches'].forEach((match) => {
        // Check all foreign key fields that should be UUID or null
        const foreignKeyFields = [
          'team1_id',
          'team2_id',
          'winner_id',
          'loser_id',
          'next_win_match_id',
          'next_lose_match_id',
          'bracket_id',
        ];

        foreignKeyFields.forEach((field) => {
          const value = match[field];
          if (value !== null) {
            expect(typeof value).toBe('string');
            expect(value).not.toBe('undefined');
            expect(isValidUUID(value)).toBe(true);
          }
        });
      });
    }
  });
});
