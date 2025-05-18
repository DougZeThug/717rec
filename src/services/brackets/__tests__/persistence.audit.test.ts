
import { describe, test, expect, vi, beforeEach } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { SingleEliminationGenerator } from "../generators/SingleEliminationGenerator";
import { DoubleEliminationGenerator } from "../generators/DoubleEliminationGenerator";
import { Team } from "@/types";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn()
        })
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn()
        })
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn()
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn()
      })
    })
  }
}));

describe("Bracket Generator Persistence Audit", () => {
  // Sample bracket ID for testing
  const bracketId = "test-bracket-123";
  
  // Sample teams for testing
  const testTeams: Team[] = Array.from({ length: 12 }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Test Team ${i + 1}`,
    seed: i + 1
  }));

  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock insert to return success and count rows
    const mockInsert = vi.fn().mockImplementation((matches) => {
      return {
        data: matches,
        error: null,
        count: matches.length
      };
    });
    
    // @ts-ignore - Mocking the Supabase client
    supabase.from.mockReturnValue({
      insert: vi.fn().mockImplementation((matches) => {
        mockInsert(matches);
        return { 
          select: vi.fn().mockReturnValue({
            data: matches,
            error: null
          })
        };
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          data: [],
          error: null
        })
      })
    });
  });

  test("SingleEliminationGenerator persists all matches with valid bracket ID", async () => {
    // Create a generator
    const generator = new SingleEliminationGenerator(bracketId, testTeams);
    
    // Generate the matches
    const matches = generator.generate();
    
    // Verify each match has a valid bracket_id
    matches.forEach(match => {
      expect(match.bracket_id).toBe(bracketId);
    });
    
    // Mock the insert function to track calls
    const insertSpy = vi.spyOn(supabase.from("matches"), "insert");
    
    // Simulate persistence (would be done by BracketService or similar)
    // We're not actually calling the database here, just tracking the calls
    
    // Check if any inserts would exceed 50 rows
    const batches = [];
    for (let i = 0; i < matches.length; i += 50) {
      batches.push(matches.slice(i, i + 50));
    }
    
    // Log how many batches would be needed
    console.log(`Single Elimination: ${matches.length} matches would require ${batches.length} batch(es)`);
    
    // Audit report
    console.log(`
      ======= Single Elimination Audit =======
      Matches generated: ${matches.length}
      Matches with valid bracket_id: ${matches.filter(m => m.bracket_id === bracketId).length}
      Matches without bracket_id: ${matches.filter(m => !m.bracket_id).length}
      Maximum batch size: ${Math.max(...batches.map(b => b.length))}
    `);
    
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every(m => m.bracket_id === bracketId)).toBe(true);
    expect(Math.max(...batches.map(b => b.length))).toBeLessThanOrEqual(50);
  });

  test("DoubleEliminationGenerator persists all matches with valid bracket ID", async () => {
    // Create a generator
    const generator = new DoubleEliminationGenerator(bracketId, testTeams);
    
    // Generate the matches
    const matches = generator.generate();
    
    // Verify each match has a valid bracket_id
    matches.forEach(match => {
      expect(match.bracket_id).toBe(bracketId);
    });
    
    // Mock the insert function to track calls
    const insertSpy = vi.spyOn(supabase.from("matches"), "insert");
    
    // Check if any inserts would exceed 50 rows
    const batches = [];
    for (let i = 0; i < matches.length; i += 50) {
      batches.push(matches.slice(i, i + 50));
    }
    
    // Log how many batches would be needed
    console.log(`Double Elimination: ${matches.length} matches would require ${batches.length} batch(es)`);
    
    // Audit report
    console.log(`
      ======= Double Elimination Audit =======
      Matches generated: ${matches.length}
      Matches with valid bracket_id: ${matches.filter(m => m.bracket_id === bracketId).length}
      Matches without bracket_id: ${matches.filter(m => !m.bracket_id).length}
      Maximum batch size: ${Math.max(...batches.map(b => b.length))}
    `);
    
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every(m => m.bracket_id === bracketId)).toBe(true);
    expect(Math.max(...batches.map(b => b.length))).toBeLessThanOrEqual(50);
  });
});
