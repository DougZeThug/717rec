import { format } from 'date-fns';
import { TeamPairingMap, MatchQualityMetrics } from '@/types/autoSchedule';

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
    console.error('Error formatting schedule date:', error);
    return format(date, 'EEEE, MMMM d, yyyy');
  }
};

/**
 * Get statistics for time blocks - keep rest of function the same
 */
export const getTimeBlocksStatistics = (timeBlockTeams) => {
  const blocks = Object.keys(timeBlockTeams);
  
  if (blocks.length === 0) {
    return { total: 0, odd: 0 };
  }
  
  let totalTeams = 0;
  let oddBlocks = 0;
  
  Object.entries(timeBlockTeams).forEach(([block, teams]) => {
    totalTeams += teams.length;
    if (teams.length % 2 !== 0) oddBlocks++;
  });
  
  return { total: totalTeams, odd: oddBlocks };
};

/**
 * Analyze match quality metrics - keep rest of function the same
 */
export const analyzeMatchQuality = (generatedPairings: TeamPairingMap): MatchQualityMetrics => {
  let totalMatches = 0;
  let totalCompatibilityScore = 0;
  let rematchCount = 0;
  
  Object.values(generatedPairings).forEach(blockPairings => {
    totalMatches += blockPairings.length;
    
    blockPairings.forEach(pairing => {
      totalCompatibilityScore += pairing.compatibilityScore;
      if (pairing.hasPlayedBefore) rematchCount++;
    });
  });
  
  const averageCompatibilityScore = totalMatches > 0 
    ? totalCompatibilityScore / totalMatches 
    : 0;
  
  return {
    totalMatches,
    rematchCount,
    averageCompatibilityScore,
    qualityRating: averageCompatibilityScore >= 7 ? "Excellent" : 
                   averageCompatibilityScore >= 5 ? "Good" : "Fair"
  };
};
