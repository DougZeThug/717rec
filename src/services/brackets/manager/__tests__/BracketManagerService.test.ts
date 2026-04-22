import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createStageMock,
  createBracketMock,
  updateMatchMock,
  normalizeR1Mock,
  normalizeGFMock,
  propagateMock,
} = vi.hoisted(() => ({
  createStageMock: vi.fn(),
  createBracketMock: vi.fn(),
  updateMatchMock: vi.fn(),
  normalizeR1Mock: vi.fn(),
  normalizeGFMock: vi.fn(),
  propagateMock: vi.fn(),
}));

vi.mock('brackets-manager', () => ({
  BracketsManager: vi.fn().mockImplementation(() => ({
    create: { stage: createStageMock },
    update: { match: updateMatchMock },
  })),
}));

vi.mock('../SupabaseSqlStorage', () => ({
  SupabaseSqlStorage: vi.fn().mockImplementation(() => ({
    select: vi.fn(),
    update: vi.fn(),
    loadParticipantsForTournament: vi.fn(),
    clearParticipantCache: vi.fn(),
  })),
}));

vi.mock('../services/BracketCreationService', () => ({
  BracketCreationService: vi.fn().mockImplementation(() => ({
    createBracket: createBracketMock,
  })),
}));

vi.mock('../services/BracketUpdateService', () => ({
  BracketUpdateService: vi.fn().mockImplementation(() => ({
    updateMatch: updateMatchMock,
  })),
}));

vi.mock('../services/BracketNormalizationService', () => ({
  BracketNormalizationService: vi.fn().mockImplementation(() => ({
    normalizeLosersR1: normalizeR1Mock,
    normalizeGrandFinalPopulation: normalizeGFMock,
    propagateCompletedMatches: propagateMock,
  })),
}));

vi.mock('../services/BracketAdminService', () => ({
  BracketAdminService: vi.fn().mockImplementation(() => ({
    checkByeEligibility: vi.fn(),
    adminToggleByeReady: vi.fn(),
    editMatchParticipants: vi.fn(),
  })),
}));

vi.mock('../services/BracketStandingsService', () => ({
  BracketStandingsService: vi.fn().mockImplementation(() => ({
    calculateFinalStandings: vi.fn(),
  })),
}));

vi.mock('../services/BracketSeedingService', () => ({
  BracketSeedingService: vi.fn().mockImplementation(() => ({
    updateSeeding: vi.fn(),
  })),
}));

import { BracketManagerService } from '../BracketManagerService';

describe('BracketManagerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path lifecycle: createBracket then updateMatch delegate to specialized services', async () => {
    createBracketMock.mockResolvedValue(undefined);
    updateMatchMock.mockResolvedValue(undefined);

    const service = new BracketManagerService();

    await service.createBracket({
      bracketId: 'b-1',
      format: 'double_elimination',
      grandFinalType: 'simple',
      teams: [{ id: 't-1', name: 'One', seed: 1 }],
    });

    await service.updateMatch({
      matchId: 77,
      scores: {
        opponent1: { score: 21, result: 'win' },
        opponent2: { score: 19, result: 'loss' },
      },
    });

    expect(createBracketMock).toHaveBeenCalledWith(
      expect.objectContaining({ bracketId: 'b-1', format: 'double_elimination' })
    );
    expect(updateMatchMock).toHaveBeenCalledWith(
      expect.objectContaining({ matchId: 77 })
    );
  });

  it('malformed bracket input: createBracket invariants reject invalid payloads from creation service', async () => {
    createBracketMock.mockRejectedValue(new Error('Bracket creation failed: malformed bracket input'));

    const service = new BracketManagerService();

    await expect(
      service.createBracket({
        bracketId: 'bad',
        format: 'double_elimination',
        teams: [],
      })
    ).rejects.toThrow(/malformed bracket input/i);
  });

  it('partial write failure: update lifecycle bubbles downstream update service failures', async () => {
    updateMatchMock.mockRejectedValue(new Error('partial write failures while updating next round'));

    const service = new BracketManagerService();

    await expect(
      service.updateMatch({
        matchId: 91,
        scores: {
          opponent1: { score: 2, result: 'win' },
          opponent2: { score: 0, result: 'loss' },
        },
      })
    ).rejects.toThrow(/partial write failures/i);
  });
});
