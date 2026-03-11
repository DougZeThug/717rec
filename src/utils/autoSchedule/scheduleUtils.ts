import { format } from 'date-fns';

import { MatchQualityMetrics, TeamPairingMap, TimeBlockTeamsMap } from '@/types/autoSchedule';
import { errorLog } from '@/utils/logger';

import { calculateComprehensiveQualityMetrics } from './qualityAnalysis';

/**
 * Format date for display in schedule UI
 */
export const formatScheduleDate = (date: Date | null): string => {
  if (!date) return '';

  try {
    // Use UTC methods to avoid timezone issues
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    // Reconstruct date using fixed timezone
    const normalizedDate = new Date(Date.UTC(year, month, day));

    return format(normalizedDate, 'EEEE, MMMM d, yyyy');
  } catch (error) {
    errorLog('Error formatting schedule date:', error);
    return format(date, 'EEEE, MMMM d, yyyy');
  }
};

/**
 * Get statistics for time blocks - now with proper typing
 */
export const getTimeBlocksStatistics = (timeBlockTeams: TimeBlockTeamsMap) => {
  const blocks = Object.keys(timeBlockTeams);

  if (blocks.length === 0) {
    return { total: 0, odd: 0 };
  }

  let totalTeams = 0;
  let oddBlocks = 0;

  Object.entries(timeBlockTeams).forEach(([_block, teams]) => {
    totalTeams += teams.length;
    if (teams.length % 2 !== 0) oddBlocks++;
  });

  return { total: totalTeams, odd: oddBlocks };
};

/**
 * Analyze match quality metrics using comprehensive analysis
 */
export const analyzeMatchQuality = (generatedPairings: TeamPairingMap): MatchQualityMetrics => {
  // Use the comprehensive quality metrics calculation
  return calculateComprehensiveQualityMetrics(generatedPairings, 0, ['basic']);
};
