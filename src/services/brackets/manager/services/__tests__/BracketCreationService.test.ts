import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockSupabaseFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockSupabaseFrom(table),
  },
}));

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
import type { CreateBracketOptions } from '../../types/BracketServiceTypes';
import { BracketCreationService } from '../BracketCreationService';

// ─── Test helpers ────────────────────────────────────────────────────────────

const BRACKET_ID = 'bracket-1';

const teams = (count: number): CreateBracketOptions['teams'] =>
  Array.from({ length: count }, (_, i) => ({
    id: `t${i + 1}`,
    name: `Team ${i + 1}`,
    seed: i + 1,
  }));

interface CapturedStage {
  seeding: Array<{ name: string; team_id: string } | null>;
  settings: { seedOrdering: string[]; grandFinal: string };
}

describe('BracketCreationService.createBracket', () => {
  let service: BracketCreationService;
  let mockStorage: SupabaseSqlStorage;
  let createStage: ReturnType<typeof vi.fn>;

  const capturedStage = (): CapturedStage => createStage.mock.calls[0][0] as CapturedStage;

  beforeEach(() => {
    vi.clearAllMocks();

    createStage = vi.fn();

    // No participants come back, so the service skips the seed-position sync —
    // these tests are about what gets handed to brackets-manager.
    mockStorage = {
      select: vi.fn().mockResolvedValue([]),
    } as unknown as SupabaseSqlStorage;

    mockSupabaseFrom.mockReturnValue({});

    service = new BracketCreationService(mockStorage, {
      create: { stage: createStage },
    } as unknown as import('brackets-manager').BracketsManager);
  });

  describe('seed ordering', () => {
    // The lower-bracket orderings belong to brackets-manager, which resolves
    // them from its own size-keyed `defaultMinorOrdering` table for every
    // ordering index we leave out. Hard-coding them here previously topped out
    // at 16 and silently mis-seeded the lower bracket of 32-team brackets — see
    // tests/bracketManagerLibraryNative.test.ts for the resolved values per size.
    it.each([
      ['single_elimination' as const, 6],
      ['single_elimination' as const, 32],
      ['double_elimination' as const, 6],
      ['double_elimination' as const, 16],
      // The regression: this used to receive the 16-team lower-bracket list.
      ['double_elimination' as const, 32],
    ])('passes only the WB first-round method for %s with %i teams', async (format, count) => {
      await service.createBracket({ bracketId: BRACKET_ID, format, teams: teams(count) });

      expect(createStage).toHaveBeenCalledTimes(1);
      expect(capturedStage().settings.seedOrdering).toEqual(['inner_outer']);
    });
  });

  describe('sizing and seeding', () => {
    it('pads a 17-team bracket up to 32 slots, BYEs last', async () => {
      await service.createBracket({
        bracketId: BRACKET_ID,
        format: 'double_elimination',
        teams: teams(17),
      });

      const { seeding } = capturedStage();
      expect(seeding).toHaveLength(32);
      expect(seeding.filter((slot) => slot !== null)).toHaveLength(17);
      expect(seeding.slice(17).every((slot) => slot === null)).toBe(true);
    });

    it('orders the seeding array by seed, carrying team_id', async () => {
      await service.createBracket({
        bracketId: BRACKET_ID,
        format: 'double_elimination',
        teams: [
          { id: 't3', name: 'Third', seed: 3 },
          { id: 't1', name: 'First', seed: 1 },
          { id: 't2', name: 'Second', seed: 2 },
        ],
      });

      expect(capturedStage().seeding.slice(0, 3)).toEqual([
        { name: 'First', team_id: 't1' },
        { name: 'Second', team_id: 't2' },
        { name: 'Third', team_id: 't3' },
      ]);
    });
  });

  describe('grand final', () => {
    it('uses the requested type for double elimination', async () => {
      await service.createBracket({
        bracketId: BRACKET_ID,
        format: 'double_elimination',
        teams: teams(4),
        grandFinalType: 'double',
      });

      expect(capturedStage().settings.grandFinal).toBe('double');
    });

    it("forces 'none' for single elimination", async () => {
      await service.createBracket({
        bracketId: BRACKET_ID,
        format: 'single_elimination',
        teams: teams(4),
        grandFinalType: 'double',
      });

      expect(capturedStage().settings.grandFinal).toBe('none');
    });
  });
});
