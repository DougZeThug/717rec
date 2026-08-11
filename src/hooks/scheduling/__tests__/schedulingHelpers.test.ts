import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const toast = vi.fn();
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/utils/autoSchedule/dualBlock', () => ({
  balanceTeamsBetweenBlocks: vi.fn((primary, secondary) => ({
    primaryAdjusted: secondary,
    secondaryAdjusted: primary,
    unmatchedTeamIds: ['unmatched'],
  })),
}));

import { useDualBlockLogic } from '../useDualBlockLogic';
import { useScheduleValidation } from '../useScheduleValidation';
import { convertPairingsToMatches } from '../utils/matchConversionUtils';

const team = (id: string) => ({ id, name: id }) as never;
const pairing = (a: string, b: string) => ({ team1: team(a), team2: team(b), score: 1 });

afterEach(() => vi.resetAllMocks());

describe('schedule validation', () => {
  it('reports odd and insufficient blocks', () => {
    const { result } = renderHook(() => useScheduleValidation());
    expect(result.current.validateAndNotify({ Early: [team('a')], Late: [] })).toEqual(['Early']);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringContaining('Early') })
    );
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringContaining('insufficient') })
    );
  });

  it('does not show warnings for matchable blocks', () => {
    const { result } = renderHook(() => useScheduleValidation());
    expect(result.current.validateAndNotify({ Early: [team('a'), team('b')] })).toEqual([]);
    expect(toast).not.toHaveBeenCalled();
  });
});

describe('dual-block logic', () => {
  it('routes configured blocks through balancing and exposes paired state', () => {
    const { result } = renderHook(() => useDualBlockLogic());
    const balanced = result.current.performTeamBalancing({ A: [team('a')], B: [team('b')] }, {
      primaryBlock: 'A',
      secondaryBlock: 'B',
    } as never);
    expect(balanced).toEqual({
      balancedTeams: { A: [team('b')], B: [team('a')] },
      unmatchedTeamIds: ['unmatched'],
    });
    const paired = {
      A: { primaryBlock: 'A', secondaryBlock: 'B', primaryTeams: [], secondaryTeams: [] },
    };
    act(() => result.current.setPairedBlocks(paired));
    expect(result.current.pairedBlocks).toEqual(paired);
  });
});

describe('match conversion', () => {
  it('replaces pairings with standard matches and alternates timeslots', () => {
    vi.spyOn(Date, 'now').mockReturnValue(100);
    const matches = convertPairingsToMatches(
      { Early: [pairing('a', 'b'), pairing('c', 'd')] } as never,
      new Date('2026-01-01')
    );
    expect(matches).toEqual([
      expect.objectContaining({ id: '100-Early-0', team1Id: 'a', team2Id: 'b' }),
      expect.objectContaining({ id: '100-Early-1', team1Id: 'c', team2Id: 'd' }),
    ]);
    expect(matches[0].timeslot).not.toBe(matches[1].timeslot);
  });

  it('marks primary and secondary matches in dual mode', () => {
    const matches = convertPairingsToMatches(
      { Early: [pairing('a', 'b')], Late: [pairing('a', 'b')] } as never,
      new Date('2026-01-01'),
      { dualMatchMode: true }
    );
    expect(matches.map((match) => match.blockType)).toEqual(['primary', 'secondary']);
  });

  it('returns no matches for invalid input or an unknown block', () => {
    expect(convertPairingsToMatches(null as never, new Date())).toEqual([]);
    expect(convertPairingsToMatches({ Unknown: [pairing('a', 'b')] } as never, new Date())).toEqual(
      []
    );
  });
});
