import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';
import type { PairingResult, TeamPairingMap, TimeBlockTeamsMap } from '@/types/autoSchedule';

/**
 * Integration test for the REAL auto-schedule generate -> apply -> edit -> conflict
 * -> corrective-edit loop.
 *
 * Only the external data seams are mocked (Supabase-backed team loading, the pairing
 * algorithm, season/team query hooks, toast, logger, sessionStorage persistence, and the
 * rematch history lookup). The pieces under test stay REAL:
 *   - useAutoSchedule (orchestrator)
 *   - useEditableMatches (edit ops + async validation effect)
 *   - validateMatchSchedule / findTeamConflicts
 *
 * The loop exercised end-to-end:
 *   1. load teams (mocked loader) -> generate (mocked algorithm) -> apply (REAL conversion)
 *      produces a deterministic set of editableMatches with no conflicts -> isValid === true.
 *   2. edit that double-books one team into two matches at the SAME timeslot
 *      -> validation.isValid === false with a real 'duplicate-team' error.
 *   3. corrective edit (move that team's match to a different timeslot)
 *      -> validation returns to isValid === true.
 */

// ---- Deterministic fixtures ---------------------------------------------------

const TEAM_A: Team = { id: 'team-a', name: 'Team A' } as unknown as Team;
const TEAM_B: Team = { id: 'team-b', name: 'Team B' } as unknown as Team;
const TEAM_C: Team = { id: 'team-c', name: 'Team C' } as unknown as Team;
const TEAM_D: Team = { id: 'team-d', name: 'Team D' } as unknown as Team;

// Two matches, both in the SINGLE block "Early" so the block map is consistent and the
// cross-block defensive validation inside handleApplySchedule passes trivially.
const BLOCK = 'Early';

const LOADED_TEAMS: TimeBlockTeamsMap = {
  [BLOCK]: [TEAM_A, TEAM_B, TEAM_C, TEAM_D],
};

const GENERATED_PAIRINGS: TeamPairingMap = {
  [BLOCK]: [
    { team1: TEAM_A, team2: TEAM_B, compatibilityScore: 8, hasPlayedBefore: false },
    { team1: TEAM_C, team2: TEAM_D, compatibilityScore: 8, hasPlayedBefore: false },
  ],
};

// ---- External seam mocks (must precede import of the hook under test) ----------

// Rematch async check: deterministic, never hits Supabase.
vi.mock('@/utils/autoSchedule/matchHistoryService', () => ({
  haveTeamsPlayedBefore: vi.fn().mockResolvedValue(false),
  fetchSeasonHistoryForTeams: vi.fn().mockResolvedValue([]),
}));

// sessionStorage persistence: no-ops / passthrough (mirrors useAutoScheduleState.test.ts).
vi.mock('../storage', () => ({
  loadAutoScheduleState: () => null,
  saveAutoScheduleState: vi.fn(),
  clearAutoScheduleState: vi.fn(),
  deserializeMatches: (matches: unknown) => matches,
  serializeMatches: (matches: unknown) => matches,
}));

// Team loader seam (Supabase-backed) -> known teams for the block.
vi.mock('@/utils/autoSchedule/teamLoaderUtils', () => ({
  getAllBackToBackTeams: vi.fn().mockResolvedValue({ Early: [] }),
  getTeamsByBackToBackPair: vi.fn().mockResolvedValue([]),
}));

// Pairing algorithm seam -> known pairings, no algorithm/network work.
const mockGenerateMatchPairings = vi.fn();
vi.mock('@/hooks/scheduling/usePairingGenerator', () => ({
  usePairingGenerator: () => ({
    isGenerating: false,
    generatedPairings: {},
    unmatchedTeamIds: [],
    teamBlockMap: {},
    generateMatchPairings: mockGenerateMatchPairings,
  }),
}));

// Season / teams query hooks.
vi.mock('@/hooks/useSeasons', () => ({
  useActiveSeason: () => ({ data: { id: 'season-1' } }),
}));
vi.mock('@/hooks/teams', () => ({
  useTeamsMap: () => ({ teams: {} }),
}));

// Toast + logger as no-op spies.
const mockToast = vi.fn();
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));
vi.mock('@/utils/logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/logger')>();
  // Keep the real module shape (many logger exports are referenced deep in the call
  // graph) but silence the console-writing helpers we care about.
  return {
    ...actual,
    log: vi.fn(),
    errorLog: vi.fn(),
    warnLog: vi.fn(),
    debugLog: vi.fn(),
    dbLog: vi.fn(),
    scheduleLog: vi.fn(),
    successLog: vi.fn(),
  };
});

import { getAllBackToBackTeams } from '@/utils/autoSchedule/teamLoaderUtils';

import { useAutoSchedule } from '../index';

// ---- Test harness -------------------------------------------------------------

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

/**
 * Drive load -> generate -> apply so editableMatches + edit mode are populated with
 * the two deterministic, conflict-free matches.
 */
async function renderReadyToEdit() {
  vi.mocked(getAllBackToBackTeams).mockResolvedValue(LOADED_TEAMS);
  mockGenerateMatchPairings.mockResolvedValue({
    pairings: GENERATED_PAIRINGS,
    unmatchedTeamIds: [],
  } satisfies PairingResult);

  const { result } = renderHook(() => useAutoSchedule(), { wrapper: createWrapper() });

  // 1. Load teams (mocked loader populates timeBlockTeams -> teamBlockMap).
  await act(async () => {
    await result.current.handleLoadTeams();
  });

  // 2. Generate pairings (mocked algorithm populates generatedPairings state).
  await act(async () => {
    await result.current.handleGenerateClick();
  });

  await waitFor(() => {
    expect(mockGenerateMatchPairings).toHaveBeenCalled();
  });

  // 3. Apply -> REAL pairing->match conversion sets generatedMatches + editableMatches.
  act(() => {
    result.current.handleApplySchedule();
  });

  await waitFor(() => {
    expect(result.current.editableMatches).toHaveLength(2);
  });

  // Enter edit mode so useEditableMatches runs its validation effect.
  act(() => {
    result.current.setIsEditMode(true);
  });

  return result;
}

// ---- Tests --------------------------------------------------------------------

describe('auto-schedule generate -> conflict -> edit loop (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generate+apply yields a conflict-free schedule that validates as isValid=true', async () => {
    const result = await renderReadyToEdit();

    // The applied schedule matches the deterministic pairings exactly.
    const timeslots = result.current.editableMatches.map((m) => m.timeslot);
    expect(timeslots).toEqual([BLOCK, BLOCK]);
    expect(result.current.editableMatches.map((m) => m.team1Id)).toEqual(['team-a', 'team-c']);

    // REAL async validation effect settles to a clean, valid result.
    await waitFor(() => {
      expect(result.current.validation).not.toBeNull();
      expect(result.current.validation?.isValid).toBe(true);
    });
    expect(result.current.validation?.errors).toHaveLength(0);
  });

  it('edit that double-books a team at one timeslot surfaces a real duplicate-team conflict, and a corrective edit clears it', async () => {
    const result = await renderReadyToEdit();

    // Baseline: clean and valid.
    await waitFor(() => {
      expect(result.current.validation?.isValid).toBe(true);
    });

    // The two matches are: match "Early-0" (A vs B) and "Early-1" (C vs D), both at "Early".
    const matchToEdit = result.current.editableMatches[1]; // Early-1 (C vs D)
    expect(matchToEdit.id).toBe('Early-1');

    // ---- EDIT: double-book team-a into the second match at the SAME timeslot ("Early").
    // Now team-a is in both Early-0 and Early-1 at "Early" -> duplicate-team conflict.
    act(() => {
      result.current.updateMatchTeam(matchToEdit.id, 'team1', 'team-a');
    });

    // hasUnsavedEdits reflects the divergence from the generated schedule.
    await waitFor(() => {
      expect(result.current.hasUnsavedEdits).toBe(true);
    });

    // REAL validation recomputes (async effect) and reports the conflict.
    await waitFor(() => {
      expect(result.current.validation?.isValid).toBe(false);
    });

    const duplicateErrors = (result.current.validation?.errors ?? []).filter(
      (e) => e.type === 'duplicate-team'
    );
    // findTeamConflicts pushes one error per matchId involved in the conflict (2 here).
    expect(duplicateErrors.length).toBeGreaterThanOrEqual(2);
    expect(duplicateErrors.map((e) => e.matchId).sort()).toEqual(['Early-0', 'Early-1']);
    expect(duplicateErrors[0].message).toContain('Early');
    expect(duplicateErrors[0].severity).toBe('error');

    // ---- CORRECTIVE EDIT: move the double-booked match to a different timeslot ("Late").
    // team-a is now in "Early" (Early-0) and "Late" (Early-1) -> no same-timeslot conflict.
    act(() => {
      result.current.updateMatchTimeslot(matchToEdit.id, 'Late');
    });

    // REAL validation recomputes and returns to valid.
    await waitFor(() => {
      expect(result.current.validation?.isValid).toBe(true);
    });
    expect(
      (result.current.validation?.errors ?? []).filter((e) => e.type === 'duplicate-team')
    ).toHaveLength(0);
  });
});
