import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock all sub-services ────────────────────────────────────────────────────

vi.mock('../TimeslotQueryService', () => ({
  TimeslotQueryService: {
    fetchByDate: vi.fn().mockResolvedValue([]),
    fetchTimeslotsByDate: vi.fn().mockResolvedValue([]),
    fetchTimeslotsForDate: vi.fn().mockResolvedValue([]),
    fetchWeekTimeslotsByTeam: vi.fn().mockResolvedValue([]),
    fetchTimeslotsForPair: vi.fn().mockResolvedValue([]),
    fetchTimeslotValidation: vi.fn().mockResolvedValue(null),
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
    assignDoubleHeader: vi.fn().mockResolvedValue([]),
    batchAssignDoubleHeaders: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../TimeslotBatchService', () => ({
  TimeslotBatchService: {
    batchAssignBackToBackTimeslots: vi.fn().mockResolvedValue([]),
    batchAssignTimeslots: vi.fn().mockResolvedValue([]),
    insertTimeslot: vi.fn().mockResolvedValue(null),
    deleteTimeslotSimple: vi.fn().mockResolvedValue(null),
    batchInsertTimeslots: vi.fn().mockResolvedValue([]),
  },
}));

// Import after mocks
import { BackToBackTimeslotService } from '../BackToBackTimeslotService';
import { DoubleHeaderService } from '../DoubleHeaderService';
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

  it('delegates fetchTimeslotsByDate to TimeslotQueryService', async () => {
    await TimeslotService.fetchTimeslotsByDate('2026-04-17');
    expect(TimeslotQueryService.fetchTimeslotsByDate).toHaveBeenCalledWith('2026-04-17');
  });

  it('delegates fetchTimeslotsForDate to TimeslotQueryService', async () => {
    await TimeslotService.fetchTimeslotsForDate('2026-04-17');
    expect(TimeslotQueryService.fetchTimeslotsForDate).toHaveBeenCalledWith('2026-04-17');
  });

  it('delegates addBackToBackTimeslot to BackToBackTimeslotService', async () => {
    const date = new Date('2026-04-17');
    await TimeslotService.addBackToBackTimeslot(date, 'team-1', 'Early');
    expect(BackToBackTimeslotService.addBackToBackTimeslot).toHaveBeenCalledWith(date, 'team-1', 'Early');
  });

  it('delegates deleteTimeslot to BackToBackTimeslotService', async () => {
    await TimeslotService.deleteTimeslot('ts-1');
    expect(BackToBackTimeslotService.deleteTimeslot).toHaveBeenCalledWith('ts-1');
  });

  it('delegates assignDoubleHeader to DoubleHeaderService', async () => {
    const date = new Date('2026-04-17');
    await TimeslotService.assignDoubleHeader(date, 'team-1', '6:30 PM', '7:30 PM');
    expect(DoubleHeaderService.assignDoubleHeader).toHaveBeenCalledWith(date, 'team-1', '6:30 PM', '7:30 PM');
  });

  it('delegates batchAssignBackToBackTimeslots to TimeslotBatchService', async () => {
    const date = new Date('2026-04-17');
    await TimeslotService.batchAssignBackToBackTimeslots(date, ['team-1'], 'Early');
    expect(TimeslotBatchService.batchAssignBackToBackTimeslots).toHaveBeenCalledWith(date, ['team-1'], 'Early');
  });

  it('delegates insertTimeslot to TimeslotBatchService', async () => {
    await TimeslotService.insertTimeslot('2026-04-17', 'team-1', '6:30 PM');
    expect(TimeslotBatchService.insertTimeslot).toHaveBeenCalledWith('2026-04-17', 'team-1', '6:30 PM');
  });

  it('delegates deleteTimeslotSimple to TimeslotBatchService', async () => {
    await TimeslotService.deleteTimeslotSimple('ts-1');
    expect(TimeslotBatchService.deleteTimeslotSimple).toHaveBeenCalledWith('ts-1');
  });
});
