import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BusinessLogicError } from '@/types/errors';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockSupabaseFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockSupabaseFrom(table),
  },
}));

// The real `handleDatabaseError` is exercised (it throws a DatabaseError); we
// only silence the logger it writes to. The service's own loggers are stubbed
// too so the suite stays quiet.
vi.mock('@/utils/logger', () => ({
  bracketLog: vi.fn(),
  errorLog: vi.fn(),
  failureLog: vi.fn(),
  successLog: vi.fn(),
  log: vi.fn(),
  warnLog: vi.fn(),
  debugLog: vi.fn(),
}));

// ─── Import service under test (after mocks) ─────────────────────────────────

import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import type { StorageParticipant, StorageStage } from '../../types/BracketServiceTypes';
import { BracketSeedingService } from '../BracketSeedingService';

// ─── Test helpers ────────────────────────────────────────────────────────────

const BRACKET_ID = 'bracket-1';
const STAGE_ID = 10;

const stage = (): StorageStage => ({
  id: STAGE_ID,
  tournament_id: BRACKET_ID,
  name: 'Playoffs',
  type: 'single_elimination',
  number: 1,
  settings: {},
});

const team = (id: string, name: string, seed: number) => ({ id, name, seed });

/** Records every participant update issued through the mocked Supabase client. */
type RecordedUpdate = { payload: Record<string, unknown>; column: string; id: unknown };

describe('BracketSeedingService.updateSeeding', () => {
  let service: BracketSeedingService;
  let mockStorage: SupabaseSqlStorage;
  let mockManager: { update: { seeding: ReturnType<typeof vi.fn> } };
  let participantUpdates: RecordedUpdate[];
  // Given a pending update, return an error object to inject (or null for success).
  let updateErrorFor: (update: RecordedUpdate) => { message: string; code?: string } | null;

  /** Wire storage.select to return the given stage + participant results. */
  const wireSelect = (opts: {
    stages?: StorageStage | StorageStage[] | null;
    participants?: StorageParticipant | StorageParticipant[] | null;
  }) => {
    (mockStorage.select as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'stage') return Promise.resolve(opts.stages ?? []);
      if (table === 'participant') return Promise.resolve(opts.participants ?? []);
      return Promise.resolve(null);
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    participantUpdates = [];
    updateErrorFor = () => null;

    // Bare mocks resolve to undefined by default, which is all the service
    // needs (it awaits both without using their return value).
    mockStorage = {
      select: vi.fn(),
      loadParticipantsForTournament: vi.fn(),
    } as unknown as SupabaseSqlStorage;

    mockManager = {
      update: {
        seeding: vi.fn(),
      },
    };

    // Mocked Supabase participant writer: `from('participant').update(payload).eq('id', id)`
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table !== 'participant') return {};
      return {
        update: (payload: Record<string, unknown>) => ({
          eq: (column: string, id: unknown) => {
            const record: RecordedUpdate = { payload, column, id };
            const error = updateErrorFor(record);
            participantUpdates.push(record);
            return Promise.resolve({ error });
          },
        }),
      };
    });

    service = new BracketSeedingService(
      mockStorage,
      mockManager as unknown as import('brackets-manager').BracketsManager
    );
  });

  describe('happy path', () => {
    it('reseeds a full (power-of-two) bracket and syncs every participant slot', async () => {
      wireSelect({
        stages: [stage()],
        participants: [
          { id: 1, tournament_id: BRACKET_ID, name: 'Alpha', team_id: 't1' },
          { id: 2, tournament_id: BRACKET_ID, name: 'Beta', team_id: 't2' },
        ],
      });

      await expect(
        service.updateSeeding({
          bracketId: BRACKET_ID,
          newSeeding: [team('t1', 'Alpha', 1), team('t2', 'Beta', 2)],
        })
      ).resolves.toBeUndefined();

      // Both reads are scoped to this tournament.
      expect(mockStorage.select).toHaveBeenCalledWith('stage', { tournament_id: BRACKET_ID });
      expect(mockStorage.select).toHaveBeenCalledWith('participant', {
        tournament_id: BRACKET_ID,
      });

      // Participants are cached before the seeding update runs.
      expect(mockStorage.loadParticipantsForTournament).toHaveBeenCalledWith(BRACKET_ID);

      // No BYEs needed for 2 teams; keepSameSize defaults to true. Seeding
      // entries are objects carrying team_id (persisted by the library).
      expect(mockManager.update.seeding).toHaveBeenCalledWith(
        STAGE_ID,
        [
          { name: 'Alpha', team_id: 't1' },
          { name: 'Beta', team_id: 't2' },
        ],
        true
      );

      // Each row's seed slot is resolved by team_id — never by name.
      expect(participantUpdates).toEqual([
        { payload: { position: 1 }, column: 'id', id: 1 },
        { payload: { position: 2 }, column: 'id', id: 2 },
      ]);
    });

    it('sorts by seed and forwards keepSameSize=false to brackets-manager', async () => {
      wireSelect({
        stages: [stage()],
        participants: [
          { id: 1, tournament_id: BRACKET_ID, name: 'Alpha', team_id: 't1' },
          { id: 2, tournament_id: BRACKET_ID, name: 'Beta', team_id: 't2' },
        ],
      });

      // Seeds provided out of order — the service must sort them.
      await service.updateSeeding({
        bracketId: BRACKET_ID,
        newSeeding: [team('t2', 'Beta', 2), team('t1', 'Alpha', 1)],
        keepSameSize: false,
      });

      expect(mockManager.update.seeding).toHaveBeenCalledWith(
        STAGE_ID,
        [
          { name: 'Alpha', team_id: 't1' },
          { name: 'Beta', team_id: 't2' },
        ],
        false
      );

      // Slot positions come from the *sorted* order, not the input order:
      // Alpha (seed 1) → position 1 even though it was supplied second.
      expect(participantUpdates).toEqual([
        { payload: { position: 1 }, column: 'id', id: 1 },
        { payload: { position: 2 }, column: 'id', id: 2 },
      ]);
    });

    it('pads with BYEs for a non-power-of-two field and clears BYE participant rows', async () => {
      wireSelect({
        stages: [stage()],
        participants: [
          { id: 1, tournament_id: BRACKET_ID, name: 'Alpha', team_id: 't1' },
          { id: 2, tournament_id: BRACKET_ID, name: 'Beta', team_id: 't2' },
          { id: 3, tournament_id: BRACKET_ID, name: 'Gamma', team_id: 't3' },
          { id: 4, tournament_id: BRACKET_ID, name: null, team_id: null }, // legacy BYE row
        ],
      });

      await service.updateSeeding({
        bracketId: BRACKET_ID,
        newSeeding: [team('t1', 'Alpha', 1), team('t2', 'Beta', 2), team('t3', 'Gamma', 3)],
      });

      // 3 teams → bracket size 4 → one trailing BYE (null).
      expect(mockManager.update.seeding).toHaveBeenCalledWith(
        STAGE_ID,
        [
          { name: 'Alpha', team_id: 't1' },
          { name: 'Beta', team_id: 't2' },
          { name: 'Gamma', team_id: 't3' },
          null,
        ],
        true
      );

      // Real teams get 1-based slots; the legacy BYE row (no team_id) has its
      // stale position cleared.
      expect(participantUpdates).toEqual([
        { payload: { position: 1 }, column: 'id', id: 1 },
        { payload: { position: 2 }, column: 'id', id: 2 },
        { payload: { position: 3 }, column: 'id', id: 3 },
        { payload: { position: null }, column: 'id', id: 4 },
      ]);
    });

    it('accepts a single stage object (not wrapped in an array)', async () => {
      wireSelect({
        stages: stage(), // returned as an object, not [stage]
        participants: [
          { id: 1, tournament_id: BRACKET_ID, name: 'Alpha', team_id: 't1' },
          { id: 2, tournament_id: BRACKET_ID, name: 'Beta', team_id: 't2' },
        ],
      });

      await expect(
        service.updateSeeding({
          bracketId: BRACKET_ID,
          newSeeding: [team('t1', 'Alpha', 1), team('t2', 'Beta', 2)],
        })
      ).resolves.toBeUndefined();

      expect(mockManager.update.seeding).toHaveBeenCalledWith(
        STAGE_ID,
        [
          { name: 'Alpha', team_id: 't1' },
          { name: 'Beta', team_id: 't2' },
        ],
        true
      );
    });

    it('skips participant sync entirely when the re-read returns null', async () => {
      wireSelect({ stages: [stage()], participants: null });

      await expect(
        service.updateSeeding({
          bracketId: BRACKET_ID,
          newSeeding: [team('t1', 'Alpha', 1)],
        })
      ).resolves.toBeUndefined();

      expect(participantUpdates).toEqual([]);
    });

    it('clears the slot position of rows whose team is not in the new seeding', async () => {
      wireSelect({
        stages: [stage()],
        participants: [
          { id: 1, tournament_id: BRACKET_ID, name: 'Alpha', team_id: 't1' },
          { id: 9, tournament_id: BRACKET_ID, name: 'Ghost', team_id: 't9' }, // removed team
        ],
      });

      await service.updateSeeding({
        bracketId: BRACKET_ID,
        newSeeding: [team('t1', 'Alpha', 1)],
      });

      // Alpha gets its slot; the removed team's row has its position cleared
      // so it can't shadow a real seed.
      expect(participantUpdates).toEqual([
        { payload: { position: 1 }, column: 'id', id: 1 },
        { payload: { position: null }, column: 'id', id: 9 },
      ]);
    });
  });

  describe('error handling', () => {
    it('wraps a missing stage (empty array) in a BusinessLogicError without touching brackets-manager', async () => {
      wireSelect({ stages: [] });

      await expect(
        service.updateSeeding({
          bracketId: BRACKET_ID,
          newSeeding: [team('t1', 'Alpha', 1)],
        })
      ).rejects.toThrow(BusinessLogicError);

      await expect(
        service.updateSeeding({
          bracketId: BRACKET_ID,
          newSeeding: [team('t1', 'Alpha', 1)],
        })
      ).rejects.toThrow(/Seeding update failed:.*Stage with ID 'bracket-1' not found/);

      expect(mockStorage.loadParticipantsForTournament).not.toHaveBeenCalled();
      expect(mockManager.update.seeding).not.toHaveBeenCalled();
    });

    it('wraps a null stage result in a BusinessLogicError', async () => {
      wireSelect({ stages: null });

      await expect(
        service.updateSeeding({
          bracketId: BRACKET_ID,
          newSeeding: [team('t1', 'Alpha', 1)],
        })
      ).rejects.toThrow(BusinessLogicError);

      expect(mockManager.update.seeding).not.toHaveBeenCalled();
    });

    it('maps a match-result conflict to a friendly BusinessLogicError', async () => {
      wireSelect({ stages: [stage()] });
      mockManager.update.seeding.mockRejectedValue(
        new Error('Reseeding would impact existing match results')
      );

      await expect(
        service.updateSeeding({
          bracketId: BRACKET_ID,
          newSeeding: [team('t1', 'Alpha', 1), team('t2', 'Beta', 2)],
        })
      ).rejects.toThrow(/Cannot update seeding:.*haven't started matches yet/);
    });

    // The conflict branch fires on EITHER 'impact' or 'result'; pin each arm
    // independently so dropping one condition can't slip through.
    it('maps a bare "result" message to the friendly conflict error', async () => {
      wireSelect({ stages: [stage()] });
      mockManager.update.seeding.mockRejectedValue(new Error('has existing results'));

      await expect(
        service.updateSeeding({
          bracketId: BRACKET_ID,
          newSeeding: [team('t1', 'Alpha', 1), team('t2', 'Beta', 2)],
        })
      ).rejects.toThrow(/Cannot update seeding/);
    });

    it('maps a bare "impact" message to the friendly conflict error', async () => {
      wireSelect({ stages: [stage()] });
      mockManager.update.seeding.mockRejectedValue(
        new Error('reseeding would impact the schedule')
      );

      await expect(
        service.updateSeeding({
          bracketId: BRACKET_ID,
          newSeeding: [team('t1', 'Alpha', 1), team('t2', 'Beta', 2)],
        })
      ).rejects.toThrow(/Cannot update seeding/);
    });

    it('wraps an unrelated brackets-manager failure with the generic message', async () => {
      wireSelect({ stages: [stage()] });
      mockManager.update.seeding.mockRejectedValue(new Error('network down'));

      await expect(
        service.updateSeeding({
          bracketId: BRACKET_ID,
          newSeeding: [team('t1', 'Alpha', 1), team('t2', 'Beta', 2)],
        })
      ).rejects.toThrow(/Seeding update failed: network down/);
    });

    it('wraps a seed-position sync database error in a BusinessLogicError', async () => {
      wireSelect({
        stages: [stage()],
        participants: [{ id: 1, tournament_id: BRACKET_ID, name: 'Alpha', team_id: 't1' }],
      });
      updateErrorFor = () => ({ message: 'permission denied', code: '42501' });

      await expect(
        service.updateSeeding({
          bracketId: BRACKET_ID,
          newSeeding: [team('t1', 'Alpha', 1)],
        })
      ).rejects.toThrow(
        /Seeding update failed: Failed to sync participant seed position: permission denied/
      );
    });

    it('wraps a seed-clear database error in a BusinessLogicError', async () => {
      wireSelect({
        stages: [stage()],
        participants: [
          { id: 1, tournament_id: BRACKET_ID, name: 'Alpha', team_id: 't1' },
          { id: 4, tournament_id: BRACKET_ID, name: null, team_id: null },
        ],
      });
      // Only the position-clear write (row not in the new seeding) fails.
      updateErrorFor = (update) => (update.payload.position === null ? { message: 'boom' } : null);

      await expect(
        service.updateSeeding({
          bracketId: BRACKET_ID,
          newSeeding: [team('t1', 'Alpha', 1), team('t2', 'Beta', 2), team('t3', 'Gamma', 3)],
        })
      ).rejects.toThrow(/Seeding update failed: Failed to clear participant seed: boom/);
    });
  });
});
