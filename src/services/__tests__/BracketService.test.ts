
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { listBrackets, getBracketById, deleteBracket } from '../BracketService';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  }
}));

describe('BracketService', () => {
  const mockBracketData = [
    {
      id: 'bracket-1',
      title: 'Test Bracket 1',
      format: 'double_elimination',
      state: 'pending',
      matches: [
        {
          id: 'match-1',
          bracket_id: 'bracket-1',
          round_number: 1,
          position: 1,
          team1_id: 'team-1',
          team2_id: 'team-2',
          match_type: 'winners',
          best_of: 3
        }
      ]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('listBrackets', () => {
    it('should return mapped brackets when successful', async () => {
      // Setup the mock
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockResolvedValueOnce({
          data: mockBracketData,
          error: null
        })
      });

      // Call the function
      const result = await listBrackets();

      // Assertions
      expect(supabase.from).toHaveBeenCalledWith('brackets');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('bracket-1');
      expect(result[0].name).toBe('Test Bracket 1');
      expect(result[0].format).toBe('double_elimination');
      expect(result[0].matches).toHaveLength(1);
    });

    it('should throw an error when Supabase query fails', async () => {
      // Setup the mock
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error' }
        })
      });

      // Call and expect error
      await expect(listBrackets()).rejects.toThrow('Database error');
    });
  });

  describe('getBracketById', () => {
    it('should return a mapped bracket when successful', async () => {
      // Setup the mock
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: mockBracketData[0],
          error: null
        })
      });

      // Call the function
      const result = await getBracketById('bracket-1');

      // Assertions
      expect(supabase.from).toHaveBeenCalledWith('brackets');
      expect(result.id).toBe('bracket-1');
      expect(result.name).toBe('Test Bracket 1');
      expect(result.format).toBe('double_elimination');
    });

    it('should throw an error when Supabase query fails', async () => {
      // Setup the mock
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Bracket not found' }
        })
      });

      // Call and expect error
      await expect(getBracketById('nonexistent-id')).rejects.toThrow('Bracket not found');
    });
  });

  describe('deleteBracket', () => {
    it('should delete a bracket when successful', async () => {
      // Setup the mock
      (supabase.from as any).mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          error: null
        })
      });

      // Call the function - should not throw
      await expect(deleteBracket('bracket-1')).resolves.not.toThrow();
      
      // Verify Supabase was called correctly
      expect(supabase.from).toHaveBeenCalledWith('brackets');
    });

    it('should throw an error when Supabase delete fails', async () => {
      // Setup the mock
      (supabase.from as any).mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          error: { message: 'Delete failed' }
        })
      });

      // Call and expect error
      await expect(deleteBracket('bracket-1')).rejects.toThrow('Delete failed');
    });
  });
});
