// Re-export from split services so existing imports keep working
export type { TeamUpdate } from '@/services/TeamSeasonStatsService';
export { batchUpdateSeasonStats, fetchSeasonBreakdown } from '@/services/TeamSeasonStatsService';
