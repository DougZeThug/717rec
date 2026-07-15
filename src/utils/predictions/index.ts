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
export { formatBreakdown, isUpset, predictMatch } from './predictMatch';
