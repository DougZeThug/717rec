/**
 * TimeslotService — backwards-compatible wrapper.
 *
 * All logic now lives in the focused sub-services below.
 * Import from those directly for new code; this class exists so that
 * existing hooks and utilities require zero changes.
 */
export { BackToBackTimeslotService } from './BackToBackTimeslotService';
export { DoubleHeaderService } from './DoubleHeaderService';
export { TimeslotBatchService } from './TimeslotBatchService';
export { TimeslotQueryService } from './TimeslotQueryService';

import { BackToBackTimeslotService } from './BackToBackTimeslotService';
import { DoubleHeaderService } from './DoubleHeaderService';
import { TimeslotBatchService } from './TimeslotBatchService';
import { TimeslotQueryService } from './TimeslotQueryService';

export class TimeslotService {
  // ── Query ──────────────────────────────────────────────────────────────────
  static fetchByDate = TimeslotQueryService.fetchByDate.bind(TimeslotQueryService);
  static fetchTimeslotsByDate =
    TimeslotQueryService.fetchTimeslotsByDate.bind(TimeslotQueryService);
  static fetchTimeslotsForDate =
    TimeslotQueryService.fetchTimeslotsForDate.bind(TimeslotQueryService);
  static fetchWeekTimeslotsByTeam =
    TimeslotQueryService.fetchWeekTimeslotsByTeam.bind(TimeslotQueryService);
  static fetchTimeslotsForPair =
    TimeslotQueryService.fetchTimeslotsForPair.bind(TimeslotQueryService);
  static fetchTimeslotValidation =
    TimeslotQueryService.fetchTimeslotValidation.bind(TimeslotQueryService);

  // ── Back-to-back ───────────────────────────────────────────────────────────
  static addBackToBackTimeslot =
    BackToBackTimeslotService.addBackToBackTimeslot.bind(BackToBackTimeslotService);
  /** @deprecated Use addBackToBackTimeslot instead */
  static addTimeslot = BackToBackTimeslotService.addTimeslot.bind(BackToBackTimeslotService);
  static deleteTimeslot = BackToBackTimeslotService.deleteTimeslot.bind(BackToBackTimeslotService);

  // ── Double header ──────────────────────────────────────────────────────────
  static assignDoubleHeader = DoubleHeaderService.assignDoubleHeader.bind(DoubleHeaderService);
  static batchAssignDoubleHeaders =
    DoubleHeaderService.batchAssignDoubleHeaders.bind(DoubleHeaderService);

  // ── Batch ──────────────────────────────────────────────────────────────────
  static batchAssignBackToBackTimeslots =
    TimeslotBatchService.batchAssignBackToBackTimeslots.bind(TimeslotBatchService);
  /** @deprecated Use batchAssignBackToBackTimeslots instead */
  static batchAssignTimeslots =
    TimeslotBatchService.batchAssignTimeslots.bind(TimeslotBatchService);
  static insertTimeslot = TimeslotBatchService.insertTimeslot.bind(TimeslotBatchService);
  static deleteTimeslotSimple =
    TimeslotBatchService.deleteTimeslotSimple.bind(TimeslotBatchService);
  static batchInsertTimeslots =
    TimeslotBatchService.batchInsertTimeslots.bind(TimeslotBatchService);
}
