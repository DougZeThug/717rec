import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ProcessedTeam, SeedValidationState } from '../../types';
import { useSeedManagement } from '../useSeedManagement';

const validation: SeedValidationState = {
  hasConflicts: false,
  conflicts: [],
  isLoading: false,
  errorMessage: null,
};

const mkTeam = (id: string, seed: number): ProcessedTeam =>
  ({ id, name: `Team ${id}`, seed }) as unknown as ProcessedTeam;

describe('useSeedManagement (PR-06 resync)', () => {
  it('resyncs processedTeams when initialTeams identity/fingerprint changes', () => {
    const initial = [mkTeam('a', 1), mkTeam('b', 2)];
    const { result, rerender } = renderHook(
      ({ teams }: { teams: ProcessedTeam[] }) => useSeedManagement(teams, validation),
      { initialProps: { teams: initial } }
    );

    expect(result.current.processedTeams.map((t) => t.seed)).toEqual([1, 2]);

    // Server-side "Reset to Auto" produces new seed values on the parent.
    const reset = [mkTeam('a', 2), mkTeam('b', 1)];
    rerender({ teams: reset });

    expect(result.current.processedTeams.map((t) => t.seed)).toEqual([2, 1]);
  });

  it('does not clobber uncommitted local edits when parent teams change', () => {
    const initial = [mkTeam('a', 1), mkTeam('b', 2)];
    const { result, rerender } = renderHook(
      ({ teams }: { teams: ProcessedTeam[] }) => useSeedManagement(teams, validation),
      { initialProps: { teams: initial } }
    );

    act(() => result.current.actions.updateTeamSeed('a', 3));
    expect(result.current.state.isDirty).toBe(true);

    // Parent-side change arrives while user has pending edits — must not overwrite.
    rerender({ teams: [mkTeam('a', 5), mkTeam('b', 5)] });
    expect(result.current.processedTeams.find((t) => t.id === 'a')?.seed).toBe(3);
  });

  it('resetToAutomatic clears state and allows the next parent update to resync', () => {
    const initial = [mkTeam('a', 1), mkTeam('b', 2)];
    const { result, rerender } = renderHook(
      ({ teams }: { teams: ProcessedTeam[] }) => useSeedManagement(teams, validation),
      { initialProps: { teams: initial } }
    );

    act(() => result.current.actions.updateTeamSeed('a', 9));
    act(() => result.current.actions.resetToAutomatic());
    expect(result.current.state.pendingChanges.size).toBe(0);

    const auto = [mkTeam('a', 1), mkTeam('b', 2)];
    rerender({ teams: auto });
    expect(result.current.processedTeams.map((t) => t.seed)).toEqual([1, 2]);
  });
});