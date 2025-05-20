
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BracketCreationService } from '../BracketCreationService';
import { bracketManager } from '../../manager/BracketManager';
import { PlayoffDatabaseAdapter } from '../../database/PlayoffDatabaseAdapter';
import { v4 as uuidv4 } from 'uuid';

// Mock the BracketManager
vi.mock('../../manager/BracketManager', () => ({
  bracketManager: {
    registerParticipants: vi.fn().mockResolvedValue(undefined),
    createStage: vi.fn().mockResolvedValue(undefined),
  }
}));

// Mock the PlayoffDatabaseAdapter
vi.mock('../../database/PlayoffDatabaseAdapter', () => ({
  PlayoffDatabaseAdapter: {
    createBracket: vi.fn().mockResolvedValue({ error: null }),
  }
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mock-uuid')
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

    const bracketId = await BracketCreationService.createBracket(
      format,
      name,
      divisionId,
      teamIds
    );

    expect(bracketId).toBe('mock-uuid');
    expect(PlayoffDatabaseAdapter.createBracket).toHaveBeenCalledWith({
      id: 'mock-uuid',
      name,
      format,
      divisionId
    });
    expect(bracketManager.registerParticipants).toHaveBeenCalled();
    expect(bracketManager.createStage).toHaveBeenCalled();
    
    // Verify seedOrdering is included in the stage settings
    expect(bracketManager.createStage).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          seedOrdering: expect.arrayContaining(['natural'])
        })
      })
    );
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
