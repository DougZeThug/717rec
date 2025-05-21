
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BracketCreationService } from '../BracketCreationService';
import { bracketManager } from '../../manager/BracketManager';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";

// Mock the BracketManager
vi.mock('../../manager/BracketManager', () => ({
  bracketManager: {
    create: vi.fn().mockResolvedValue(undefined),
    formatToStageType: vi.fn().mockReturnValue('single_elimination'),
  }
}));

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'mock-uuid' }, error: null })
        }),
        error: null
      }),
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          data: [{ id: 'team1', name: 'Team 1' }, { id: 'team2', name: 'Team 2' }],
          error: null
        })
      })
    })
  }
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mock-uuid')
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}));

describe('BracketCreationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should create a single elimination bracket successfully', async () => {
    const format = 'Single Elimination';
    const name = 'Test Bracket';
    const divisionId = uuidv4();
    const teamIds = [uuidv4(), uuidv4(), uuidv4(), uuidv4()];

    // Setup the mock returns
    (supabase.from as any).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        error: null
      }),
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: teamIds.map((id, i) => ({ id, name: `Team ${i+1}` })),
          error: null
        })
      })
    });

    const bracketId = await BracketCreationService.createBracket(
      format,
      name,
      divisionId,
      teamIds
    );

    expect(bracketId).toBe('mock-uuid');
    expect(supabase.from).toHaveBeenCalledWith('brackets');
    expect(bracketManager.create).toHaveBeenCalled();
  });

  it('should handle invalid team IDs gracefully', async () => {
    const format = 'Single Elimination';
    const name = 'Test Bracket';
    const divisionId = uuidv4();
    const teamIds = [uuidv4(), undefined, '', 'undefined'];

    await expect(BracketCreationService.createBracket(
      format,
      name,
      divisionId,
      teamIds as string[]
    )).rejects.toThrow('One or more teams missing IDs');
  });

  it('should validate division ID', async () => {
    const format = 'Single Elimination';
    const name = 'Test Bracket';
    const teamIds = [uuidv4(), uuidv4()];

    await expect(BracketCreationService.createBracket(
      format,
      name,
      '',
      teamIds
    )).rejects.toThrow('Valid division ID is required');

    await expect(BracketCreationService.createBracket(
      format,
      name,
      'undefined',
      teamIds
    )).rejects.toThrow('Valid division ID is required');
  });
});
