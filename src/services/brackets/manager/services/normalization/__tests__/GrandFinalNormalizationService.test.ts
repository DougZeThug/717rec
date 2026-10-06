import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  bracketLog: vi.fn(),
  successLog: vi.fn(),
}));

import { bracketLog, successLog } from '@/utils/logger';

import type { SupabaseSqlStorage } from '../../../SupabaseSqlStorage';
import { GrandFinalNormalizationService } from '../GrandFinalNormalizationService';
import type { LbStructureService } from '../LbStructureService';

// Round ids used by the stubs below.
const GF_GROUP = { id: 30, number: 3 };
const GF_ROUND = { id: 32, number: 1 };
const WB_FINAL_ROUND = { id: 51, number: 2 };
const LB_FINAL_ROUND = { id: 21, number: 4 };

type MatchRow = Record<string, unknown>;

interface Scenario {
  gfGroup?: typeof GF_GROUP | null;
  gfRounds?: Array<{ id: number; number: number }>;
  gfMatches?: MatchRow[];
  wbFinalRound?: typeof WB_FINAL_ROUND | null;
  wbMatches?: MatchRow[];
  lbFinalRound?: typeof LB_FINAL_ROUND | null;
  lbMatches?: MatchRow[];
}

const winnerMatch = (winnerId: number, extra: MatchRow = {}): MatchRow => ({
  id: 900 + winnerId,
  number: 1,
  status: 4,
  opponent1: { id: winnerId, result: 'win' },
  opponent2: { id: 99, result: 'loss' },
  ...extra,
});

const emptyGf = (extra: MatchRow = {}): MatchRow => ({
  id: 70,
  status: 0,
  opponent1: { id: null },
  opponent2: { id: null },
  ...extra,
});

const setup = ({
  gfGroup = GF_GROUP,
  gfRounds = [GF_ROUND],
  gfMatches = [emptyGf()],
  wbFinalRound = WB_FINAL_ROUND,
  wbMatches = [],
  lbFinalRound = LB_FINAL_ROUND,
  lbMatches = [],
}: Scenario = {}) => {
  const matchesByRound: Record<number, MatchRow[]> = {
    [GF_ROUND.id]: gfMatches,
    [WB_FINAL_ROUND.id]: wbMatches,
    [LB_FINAL_ROUND.id]: lbMatches,
  };
  const storage = {
    select: vi.fn(
      async (_table: string, filter: { round_id: number }) => matchesByRound[filter.round_id]
    ),
    update: vi.fn().mockResolvedValue(true),
  };
  const lbStructure = {
    findGfGroup: vi.fn().mockResolvedValue(gfGroup),
    findGroupRounds: vi.fn().mockResolvedValue(gfRounds),
    findWbFinalRound: vi.fn().mockResolvedValue(wbFinalRound),
    findLbFinalRound: vi.fn().mockResolvedValue(lbFinalRound),
  };
  const service = new GrandFinalNormalizationService(
    storage as unknown as SupabaseSqlStorage,
    lbStructure as unknown as LbStructureService
  );
  return { service, storage, lbStructure };
};

describe('GrandFinalNormalizationService.normalizeGrandFinalPopulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('nothing to repair', () => {
    it('skips when there is no GF group', async () => {
      const { service, storage } = setup({ gfGroup: null });

      await expect(service.normalizeGrandFinalPopulation(101)).resolves.toBeUndefined();

      expect(storage.update).not.toHaveBeenCalled();
      expect(storage.select).not.toHaveBeenCalled();
      expect(bracketLog).toHaveBeenCalledWith('No GF group found, skipping normalization');
    });

    it('skips when there is no GF round 1', async () => {
      const { service, storage } = setup({ gfRounds: [{ id: 33, number: 2 }] });

      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).not.toHaveBeenCalled();
      expect(bracketLog).toHaveBeenCalledWith('No GF Round 1 found, skipping normalization');
    });

    it('skips when there is no GF match', async () => {
      const { service, storage } = setup({ gfMatches: [] });

      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).not.toHaveBeenCalled();
      expect(bracketLog).toHaveBeenCalledWith('No GF match found, skipping normalization');
    });

    it('does nothing, and looks up no finals, when both slots are filled', async () => {
      const { service, storage, lbStructure } = setup({
        gfMatches: [emptyGf({ opponent1: { id: 5 }, opponent2: { id: 8 } })],
      });

      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).not.toHaveBeenCalled();
      expect(lbStructure.findWbFinalRound).not.toHaveBeenCalled();
      expect(lbStructure.findLbFinalRound).not.toHaveBeenCalled();
    });

    it('never fills strict-null (BYE) slots', async () => {
      const { service, storage, lbStructure } = setup({
        gfMatches: [emptyGf({ opponent1: null, opponent2: null })],
      });

      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).not.toHaveBeenCalled();
      expect(lbStructure.findWbFinalRound).not.toHaveBeenCalled();
      expect(lbStructure.findLbFinalRound).not.toHaveBeenCalled();
    });

    it('does not write when the finals are not completed', async () => {
      const { service, storage } = setup({
        wbMatches: [winnerMatch(7, { status: 3 })],
        lbMatches: [winnerMatch(11, { status: 3 })],
      });

      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).not.toHaveBeenCalled();
    });

    it('does not write when a completed final has no winner', async () => {
      const noWinner = {
        id: 1,
        number: 1,
        status: 4,
        opponent1: { id: 7, result: 'loss' },
        opponent2: { id: 8 },
      };
      const { service, storage } = setup({ wbMatches: [noWinner], lbMatches: [noWinner] });

      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).not.toHaveBeenCalled();
    });

    it('does not write when the winning side has no participant id', async () => {
      const nullWinner = {
        id: 1,
        number: 1,
        status: 4,
        opponent1: { id: null, result: 'win' },
        opponent2: { id: 8, result: 'loss' },
      };
      const { service, storage } = setup({ wbMatches: [nullWinner], lbMatches: [nullWinner] });

      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).not.toHaveBeenCalled();
    });

    it('does not write when the final rounds have no matches or do not exist', async () => {
      const empty = setup({ wbMatches: [], lbMatches: [] });
      await empty.service.normalizeGrandFinalPopulation(101);
      expect(empty.storage.update).not.toHaveBeenCalled();

      const missing = setup({ wbFinalRound: null, lbFinalRound: null });
      await missing.service.normalizeGrandFinalPopulation(101);
      expect(missing.storage.update).not.toHaveBeenCalled();
    });
  });

  describe('which slots get looked up', () => {
    it('looks up only the WB final when only opponent1 is missing', async () => {
      const { service, storage, lbStructure } = setup({
        gfMatches: [emptyGf({ opponent2: { id: 8 } })],
        wbMatches: [winnerMatch(7)],
      });

      await service.normalizeGrandFinalPopulation(101);

      expect(lbStructure.findWbFinalRound).toHaveBeenCalledWith(101);
      expect(lbStructure.findLbFinalRound).not.toHaveBeenCalled();
      expect(storage.update).toHaveBeenCalledTimes(1);
    });

    it('looks up only the LB final when only opponent2 is missing', async () => {
      const { service, lbStructure } = setup({
        gfMatches: [emptyGf({ opponent1: { id: 5 } })],
        lbMatches: [winnerMatch(11)],
      });

      await service.normalizeGrandFinalPopulation(101);

      expect(lbStructure.findWbFinalRound).not.toHaveBeenCalled();
      expect(lbStructure.findLbFinalRound).toHaveBeenCalledWith(101);
    });

    it('treats an undefined slot like an empty one', async () => {
      const { service, storage } = setup({
        gfMatches: [{ id: 70, status: 0 }],
        wbMatches: [winnerMatch(7)],
        lbMatches: [winnerMatch(11)],
      });

      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).toHaveBeenCalledWith(
        'match',
        { id: 70 },
        {
          opponent1: { id: 7, position: undefined },
          opponent2: { id: 11, position: undefined },
          status: 2,
        }
      );
    });

    it('still fills opponent2 when the WB final round cannot be found', async () => {
      const { service, storage } = setup({
        wbFinalRound: null,
        lbMatches: [winnerMatch(11)],
      });

      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).toHaveBeenCalledWith(
        'match',
        { id: 70 },
        { opponent2: { id: 11, position: undefined }, status: 1 }
      );
    });
  });

  describe('which final match and winner is used', () => {
    it('reads the WB winner from opponent2 when that side won', async () => {
      const { service, storage } = setup({
        wbMatches: [
          {
            id: 1,
            number: 1,
            status: 4,
            opponent1: { id: 7, result: 'loss' },
            opponent2: { id: 8, result: 'win' },
          },
        ],
      });

      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).toHaveBeenCalledWith(
        'match',
        { id: 70 },
        { opponent1: { id: 8, position: undefined }, status: 1 }
      );
    });

    it('reads the LB winner from opponent1 when that side won', async () => {
      const { service, storage } = setup({ lbMatches: [winnerMatch(11)] });

      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).toHaveBeenCalledWith(
        'match',
        { id: 70 },
        { opponent2: { id: 11, position: undefined }, status: 1 }
      );
    });

    it('uses the highest-numbered match in the WB final round', async () => {
      const { service, storage } = setup({
        wbMatches: [
          winnerMatch(3, { number: 3 }),
          winnerMatch(1, { number: 1 }),
          winnerMatch(2, { number: 2 }),
        ],
      });

      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).toHaveBeenCalledWith(
        'match',
        { id: 70 },
        { opponent1: { id: 3, position: undefined }, status: 1 }
      );
    });

    it('uses the first match in the LB final round', async () => {
      const { service, storage } = setup({
        lbMatches: [winnerMatch(11, { number: 2 }), winnerMatch(13, { number: 1 })],
      });

      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).toHaveBeenCalledWith(
        'match',
        { id: 70 },
        { opponent2: { id: 11, position: undefined }, status: 1 }
      );
    });
  });

  describe('GF match status after the repair', () => {
    it('sets Ready (2) when both slots end up filled on a locked match', async () => {
      const { service, storage } = setup({
        gfMatches: [emptyGf({ status: 0 })],
        wbMatches: [winnerMatch(7)],
        lbMatches: [winnerMatch(11)],
      });

      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).toHaveBeenCalledWith(
        'match',
        { id: 70 },
        {
          opponent1: { id: 7, position: undefined },
          opponent2: { id: 11, position: undefined },
          status: 2,
        }
      );
    });

    it('sets Ready (2) when the repair fills the last empty slot', async () => {
      const { service, storage } = setup({
        gfMatches: [emptyGf({ status: 1, opponent1: { id: 5 } })],
        lbMatches: [winnerMatch(11)],
      });

      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).toHaveBeenCalledWith(
        'match',
        { id: 70 },
        { opponent2: { id: 11, position: undefined }, status: 2 }
      );
    });

    it('sets Waiting (1) when only one slot ends up filled on a locked match', async () => {
      const { service, storage } = setup({
        gfMatches: [emptyGf({ status: 0 })],
        wbMatches: [winnerMatch(7)],
      });

      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).toHaveBeenCalledWith(
        'match',
        { id: 70 },
        { opponent1: { id: 7, position: undefined }, status: 1 }
      );
    });

    it('treats a missing status as locked', async () => {
      const oneSlot = setup({
        gfMatches: [{ id: 70, opponent1: { id: null }, opponent2: { id: null } }],
        wbMatches: [winnerMatch(7)],
      });
      await oneSlot.service.normalizeGrandFinalPopulation(101);
      expect(oneSlot.storage.update).toHaveBeenCalledWith(
        'match',
        { id: 70 },
        { opponent1: { id: 7, position: undefined }, status: 1 }
      );

      const bothSlots = setup({
        gfMatches: [{ id: 70, opponent1: { id: null }, opponent2: { id: null } }],
        wbMatches: [winnerMatch(7)],
        lbMatches: [winnerMatch(11)],
      });
      await bothSlots.service.normalizeGrandFinalPopulation(101);
      expect(bothSlots.storage.update).toHaveBeenCalledWith(
        'match',
        { id: 70 },
        {
          opponent1: { id: 7, position: undefined },
          opponent2: { id: 11, position: undefined },
          status: 2,
        }
      );
    });

    it.each([2, 3])('keeps status %i when the match is already past locked', async (status) => {
      const { service, storage } = setup({
        gfMatches: [emptyGf({ status, opponent1: { id: 5 } })],
        lbMatches: [winnerMatch(11)],
      });

      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).toHaveBeenCalledWith(
        'match',
        { id: 70 },
        { opponent2: { id: 11, position: undefined }, status }
      );
    });

    it('keeps a running status when only one slot gets filled', async () => {
      const { service, storage } = setup({
        gfMatches: [emptyGf({ status: 3 })],
        wbMatches: [winnerMatch(7)],
      });

      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).toHaveBeenCalledWith(
        'match',
        { id: 70 },
        { opponent1: { id: 7, position: undefined }, status: 3 }
      );
    });
  });

  describe('write and logging', () => {
    it('writes once, to the GF match id', async () => {
      const { service, storage } = setup({
        gfMatches: [emptyGf({ id: 77 })],
        wbMatches: [winnerMatch(7)],
        lbMatches: [winnerMatch(11)],
      });

      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).toHaveBeenCalledTimes(1);
      expect(storage.update.mock.calls[0][1]).toEqual({ id: 77 });
    });

    it('logs which slots it populated', async () => {
      const wbOnly = setup({ wbMatches: [winnerMatch(7)] });
      await wbOnly.service.normalizeGrandFinalPopulation(101);
      expect(successLog).toHaveBeenLastCalledWith(
        'Grand Final normalized',
        'Populated [opp1] on GF match 70'
      );

      const lbOnly = setup({ lbMatches: [winnerMatch(11)] });
      await lbOnly.service.normalizeGrandFinalPopulation(101);
      expect(successLog).toHaveBeenLastCalledWith(
        'Grand Final normalized',
        'Populated [opp2] on GF match 70'
      );

      const both = setup({ wbMatches: [winnerMatch(7)], lbMatches: [winnerMatch(11)] });
      await both.service.normalizeGrandFinalPopulation(101);
      expect(successLog).toHaveBeenLastCalledWith(
        'Grand Final normalized',
        'Populated [opp1+opp2] on GF match 70'
      );
    });

    it('logs each slot it fills with the winner id', async () => {
      const { service } = setup({ wbMatches: [winnerMatch(7)], lbMatches: [winnerMatch(11)] });

      await service.normalizeGrandFinalPopulation(101);

      expect(bracketLog).toHaveBeenCalledWith(
        '✅ [NORMALIZE GF] Populating opponent1 from WB Final winner',
        { gfMatchId: 70, wbWinnerId: 7 }
      );
      expect(bracketLog).toHaveBeenCalledWith(
        '✅ [NORMALIZE GF] Populating opponent2 from LB Final winner',
        { gfMatchId: 70, lbWinnerId: 11 }
      );
    });

    it('does not log success when nothing was written', async () => {
      const { service } = setup({ wbMatches: [winnerMatch(7, { status: 3 })] });

      await service.normalizeGrandFinalPopulation(101);

      expect(successLog).not.toHaveBeenCalled();
    });
  });

  describe('failures', () => {
    it('throws when the write fails, without logging success', async () => {
      const { service, storage } = setup({ wbMatches: [winnerMatch(7)] });
      storage.update.mockRejectedValueOnce(new Error('write failed'));

      await expect(service.normalizeGrandFinalPopulation(101)).rejects.toThrow('write failed');

      expect(successLog).not.toHaveBeenCalled();
    });

    it('throws when a lookup fails', async () => {
      const { service, storage, lbStructure } = setup({ wbMatches: [winnerMatch(7)] });
      lbStructure.findWbFinalRound.mockRejectedValueOnce(new Error('lookup failed'));

      await expect(service.normalizeGrandFinalPopulation(101)).rejects.toThrow('lookup failed');

      expect(storage.update).not.toHaveBeenCalled();
    });
  });
});
