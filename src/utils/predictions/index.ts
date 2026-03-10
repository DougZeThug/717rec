/**
 * Match Prediction Utilities
 *
 * Exports the prediction logic and related utilities.
 */

export type {
  ConfidenceLevel,
  HeadToHeadStats,
  PredictionBreakdown,
  PredictionResult,
  TeamStats,
} from './predictMatch';
export {
  formatBreakdown,
  formatProbability,
  isUpset,
  predictMatch,
  UPSET_THRESHOLD,
} from './predictMatch';
