/**
 * @deprecated This file now re-exports from the modular career hooks.
 * Import directly from '@/hooks/career' for new code.
 *
 * Original 532-line god hook has been refactored into:
 * - src/utils/career/*.ts - Pure calculation functions
 * - src/hooks/career/useCareerData.ts - Data fetching
 * - src/hooks/career/useTeamTotalsComputed.ts - Composed hook
 */

// Backward compatibility - re-export hook from new modular structure
export { useTeamTotalsComputed as useTeamTotals } from './career/useTeamTotalsComputed';
