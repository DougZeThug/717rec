/**
 * TimeslotService — backwards-compatible wrapper.
 *
 * All logic now lives in the focused sub-services below.
 * Import from those directly for new code; this class exists so that
 * existing hooks and utilities require zero changes.
 */
import { BackToBackTimeslotService } from './BackToBackTimeslotService';
import { DoubleHeaderService } from './DoubleHeaderService';
import { TimeslotBatchService } from './TimeslotBatchService';
import { TimeslotQueryService } from './TimeslotQueryService';

export const TimeslotService = {
  // ── Query ──────────────────────────────────────────────────────────────────
  fetchByDate: TimeslotQueryService.fetchByDate.bind(TimeslotQueryService),
  fetchWeekTimeslotsByTeam:
    TimeslotQueryService.fetchWeekTimeslotsByTeam.bind(TimeslotQueryService),
  fetchTimeslotsForPair: TimeslotQueryService.fetchTimeslotsForPair.bind(TimeslotQueryService),
  fetchTimeslotValidation: TimeslotQueryService.fetchTimeslotValidation.bind(TimeslotQueryService),
  fetchTimeslotDates: TimeslotQueryService.fetchTimeslotDates.bind(TimeslotQueryService),

  // ── Back-to-back ───────────────────────────────────────────────────────────
  addBackToBackTimeslot:
    BackToBackTimeslotService.addBackToBackTimeslot.bind(BackToBackTimeslotService),
  /** @deprecated Use addBackToBackTimeslot instead */
  addTimeslot: BackToBackTimeslotService.addTimeslot.bind(BackToBackTimeslotService),
  deleteTimeslot: BackToBackTimeslotService.deleteTimeslot.bind(BackToBackTimeslotService),

  // ── Double header ──────────────────────────────────────────────────────────
  batchAssignDoubleHeaders: DoubleHeaderService.batchAssignDoubleHeaders.bind(DoubleHeaderService),

  // ── Batch ──────────────────────────────────────────────────────────────────
  batchAssignBackToBackTimeslots:
    TimeslotBatchService.batchAssignBackToBackTimeslots.bind(TimeslotBatchService),
  /** @deprecated Use batchAssignBackToBackTimeslots instead */
  batchAssignTimeslots: TimeslotBatchService.batchAssignTimeslots.bind(TimeslotBatchService),
  deleteTimeslotsByIds: TimeslotBatchService.deleteTimeslotsByIds.bind(TimeslotBatchService),
};
