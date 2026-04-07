/**
 * Barrel file for career data services.
 * Re-exports from focused sub-services for backwards compatibility.
 *
 * Sub-services:
 * - CareerTypes: shared type definitions
 * - CareerFetchService: single-team career data fetching
 * - CareerBulkFetchService: bulk multi-team career data fetching
 * - CareerQueryService: power score & active season queries
 */

export type { BulkTeamCareerData } from './CareerBulkFetchService';
export { fetchAllTeamsCareerData } from './CareerBulkFetchService';
export { fetchCareerData } from './CareerFetchService';
export type { CareerData } from './CareerTypes';
