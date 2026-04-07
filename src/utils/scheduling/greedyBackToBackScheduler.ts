/**
 * Greedy Back-to-Back Scheduler
 *
 * The implementation lives in `./greedy/`. This file is a thin re-export so
 * existing import paths (`@/utils/scheduling/greedyBackToBackScheduler`)
 * continue to resolve. See `./greedy/index.ts` for the public API and
 * sibling modules for the focused implementation.
 */
export {
  generateScheduleGreedy,
  generateScheduleGreedyWithTracking,
  pairKey,
} from './greedy';
export type {
  GreedySchedulerInput,
  GreedySchedulerResult,
  RelaxationLevel,
  ScheduledMatch,
} from './greedy';
