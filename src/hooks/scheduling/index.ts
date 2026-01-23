/**
 * Schedule preview and auto-scheduling hooks.
 * Provides functionality for team loading, pairing generation, validation, and match conversion.
 */

export { useDualBlockLogic } from './useDualBlockLogic';
export { type AutoScheduleStep, useSchedulePreview } from './useSchedulePreview';
export { useScheduleValidation } from './useScheduleValidation';
export { convertPairingsToMatches } from './utils/matchConversionUtils';
