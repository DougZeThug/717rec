// Export all ranking utility functions from their respective files
export * from './calculateHeadToHead';
export * from './calculateSOS';
export * from './calculateStreak';
export * from './calculateWinPercentage';
export * from './createRankingObject';
export * from './divisionWeightsCache';
export * from './sortAndUpdateRankings';
export * from '@/utils/teamDetailsUtils/gameStatsUtils';

// Export functions from the main rankingUtils file to avoid circular dependencies
export {
  loadRankingsFromStorage,
  saveRankingsToStorage,
  sortRankings,
  updateRankChanges,
} from '../rankingUtils';
