import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock all sub-services ────────────────────────────────────────────────────

vi.mock('../TimeslotQueryService', () => ({
  TimeslotQueryService: {
    fetchByDate: vi.fn().mockResolvedValue([]),
    fetchWeekTimeslotsByTeam: vi.fn().mockResolvedValue([]),
    fetchTimeslotsForPair: vi.fn().mockResolvedValue([]),
    fetchTimeslotValidation: vi.fn().mockResolvedValue(null),
    fetchTimeslotDates: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../BackToBackTimeslotService', () => ({
  BackToBackTimeslotService: {
    addBackToBackTimeslot: vi.fn().mockResolvedValue([]),
    addTimeslot: vi.fn().mockResolvedValue([]),
    deleteTimeslot: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../DoubleHeaderService', () => ({
  DoubleHeaderService: {
    batchAssignDoubleHeaders: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../TimeslotBatchService', () => ({
  TimeslotBatchService: {
    batchAssignBackToBackTimeslots: vi.fn().mockResolvedValue([]),
    batchAssignTimeslots: vi.fn().mockResolvedValue([]),
    deleteTimeslotsByIds: vi.fn().mockResolvedValue(null),
  },
}));

// Import after mocks
import { BackToBackTimeslotService } from '../BackToBackTimeslotService';
import { TimeslotBatchService } from '../TimeslotBatchService';
import { TimeslotQueryService } from '../TimeslotQueryService';
import { TimeslotService } from '../TimeslotService';

// ─── Delegation tests ─────────────────────────────────────────────────────────

describe('TimeslotService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates fetchByDate to TimeslotQueryService', async () => {
    const date = new Date('2026-04-17');
    await TimeslotService.fetchByDate(date);
    expect(TimeslotQueryService.fetchByDate).toHaveBeenCalledWith(date);
  });

  it('delegates addBackToBackTimeslot to BackToBackTimeslotService', async () => {
    const date = new Date('2026-04-17');
    await TimeslotService.addBackToBackTimeslot(date, 'team-1', 'Early');
    expect(BackToBackTimeslotService.addBackToBackTimeslot).toHaveBeenCalledWith(
      date,
      'team-1',
      'Early'
    );
  });

  it('delegates deleteTimeslot to BackToBackTimeslotService', async () => {
    await TimeslotService.deleteTimeslot('ts-1');
    expect(BackToBackTimeslotService.deleteTimeslot).toHaveBeenCalledWith('ts-1');
  });

  it('delegates batchAssignBackToBackTimeslots to TimeslotBatchService', async () => {
    const date = new Date('2026-04-17');
    await TimeslotService.batchAssignBackToBackTimeslots(date, ['team-1'], 'Early');
    expect(TimeslotBatchService.batchAssignBackToBackTimeslots).toHaveBeenCalledWith(
      date,
      ['team-1'],
      'Early'
    );
  });

  it('delegates deleteTimeslotsByIds to TimeslotBatchService', async () => {
    await TimeslotService.deleteTimeslotsByIds(['ts-1', 'ts-2']);
    expect(TimeslotBatchService.deleteTimeslotsByIds).toHaveBeenCalledWith(['ts-1', 'ts-2']);
  });
});
