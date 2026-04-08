import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockTeam, createMockTeamPairing } from '@/utils/test/autoSchedule/testHelpers';

// Mocks must be declared before imports of the modules under test
vi.mock('../../blossomPairingAlgorithm', () => ({
  generatePairingsWithBlossom: vi.fn(),
}));
vi.mock('../../matchHistoryService', () => ({
  haveTeamsPlayedBefore: vi.fn().mockResolvedValue(false),
}));

// Import mocked module to inspect calls
import { generatePairingsWithBlossom } from '../../blossomPairingAlgorithm';
import { generateDualBlockPairings } from '../pairingGenerator';

const p1 = createMockTeam({ id: 'p1', name: 'P1' });
const p2 = createMockTeam({ id: 'p2', name: 'P2' });
const s1 = createMockTeam({ id: 's1', name: 'S1' });
const s2 = createMockTeam({ id: 's2', name: 'S2' });

const defaultPrimaryPairing = createMockTeamPairing({ team1: p1, team2: p2 });
const defaultSecondaryPairing = createMockTeamPairing({ team1: s1, team2: s2 });

describe('generateDualBlockPairings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: primary call returns p1-p2, secondary call returns s1-s2
    vi.mocked(generatePairingsWithBlossom)
      .mockResolvedValueOnce([defaultPrimaryPairing])
      .mockResolvedValueOnce([defaultSecondaryPairing]);
  });

  it('returns null when primary block is missing (edge)', async () => {
    const result = await generateDualBlockPairings(
      { Late: [s1, s2] },
      { primaryBlock: 'Early', secondaryBlock: 'Late' }
    );

    expect(result).toBeNull();
  });

  it('returns null when secondary block is missing (edge)', async () => {
    const result = await generateDualBlockPairings(
      { Early: [p1, p2] },
      { primaryBlock: 'Early', secondaryBlock: 'Late' }
    );

    expect(result).toBeNull();
  });

  it('returns null when both blocks are missing', async () => {
    const result = await generateDualBlockPairings(
      { Other: [] },
      { primaryBlock: 'Early', secondaryBlock: 'Late' }
    );

    expect(result).toBeNull();
  });

  it('returns PairingResult with both block keys in pairings map (happy path)', async () => {
    const result = await generateDualBlockPairings(
      { Early: [p1, p2], Late: [s1, s2] },
      { primaryBlock: 'Early', secondaryBlock: 'Late' }
    );

    if (!result) throw new Error('Expected non-null result');
    expect(result.pairings['Early']).toBeDefined();
    expect(result.pairings['Late']).toBeDefined();
  });

  it('calls generatePairingsWithBlossom exactly twice', async () => {
    await generateDualBlockPairings(
      { Early: [p1, p2], Late: [s1, s2] },
      { primaryBlock: 'Early', secondaryBlock: 'Late' }
    );

    expect(vi.mocked(generatePairingsWithBlossom)).toHaveBeenCalledTimes(2);
  });

  it('secondary block call receives a playedPairsSet containing the primary pairing key', async () => {
    await generateDualBlockPairings(
      { Early: [p1, p2], Late: [s1, s2] },
      { primaryBlock: 'Early', secondaryBlock: 'Late' }
    );

    const secondCallConfig = vi.mocked(generatePairingsWithBlossom).mock.calls[1][1];
    const playedPairsSet = secondCallConfig.playedPairsSet as Set<string>;

    expect(playedPairsSet).toBeDefined();
    // Primary pairing key should be sorted join of p1 and p2 IDs
    const expectedKey = ['p1', 'p2'].sort().join('-');
    expect(playedPairsSet.has(expectedKey)).toBe(true);
  });

  it('unmatchedTeamIds contains teams not covered by any pairing', async () => {
    const p3 = createMockTeam({ id: 'p3', name: 'P3' });

    // Mock returns only p1-p2 pairing, leaving p3 unmatched
    vi.mocked(generatePairingsWithBlossom)
      .mockReset()
      .mockResolvedValueOnce([defaultPrimaryPairing]) // covers p1, p2
      .mockResolvedValueOnce([defaultSecondaryPairing]);

    const result = await generateDualBlockPairings(
      { Early: [p1, p2, p3], Late: [s1, s2] },
      { primaryBlock: 'Early', secondaryBlock: 'Late' }
    );

    if (!result) throw new Error('Expected non-null result');
    expect(result.unmatchedTeamIds).toContain('p3');
  });

  it('invokes notifyCallback when a block is missing', async () => {
    const callback = vi.fn();

    await generateDualBlockPairings(
      { Late: [s1, s2] },
      { primaryBlock: 'Early', secondaryBlock: 'Late' },
      callback
    );

    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0][0].variant).toBe('destructive');
  });

  it('returns null and calls notifyCallback on thrown exception', async () => {
    vi.mocked(generatePairingsWithBlossom).mockReset().mockRejectedValue(new Error('boom'));
    const callback = vi.fn();

    const result = await generateDualBlockPairings(
      { Early: [p1, p2], Late: [s1, s2] },
      { primaryBlock: 'Early', secondaryBlock: 'Late' },
      callback
    );

    expect(result).toBeNull();
    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0][0].variant).toBe('destructive');
  });
});
