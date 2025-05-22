

/**
 * @deprecated Use the modular timezone utilities from src/utils/timezone instead
 * This file is kept for backward compatibility and will be removed in a future version
 */

// Re-export everything from the modular timezone utilities
export * from './timezone';

// Explicitly re-export the needed functions for backward compatibility
export { extractTimeSlotFromUTC } from './timezone/formatters';
export { formatTimeToUTC } from './timezone/converters';

