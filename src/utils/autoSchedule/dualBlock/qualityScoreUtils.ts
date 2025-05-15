
/**
 * Calculate overall quality score for dual block schedule
 * 
 * @param metrics - Various metrics about the generated schedule
 * @returns A quality score from 0-100
 */
export const calculateOverallQualityScore = (metrics: {
  crossBlockCompatibility: number;
  teamsWithBothMatches: number;
  teamsWithDuplicateOpponents: number;
  totalTeams: number;
  averageCompatibilityScore: number;
  blockBalanceScore: number;
}): number => {
  // Weight factors for different aspects of quality
  const weights = {
    crossBlockWeight: 0.3,      // How well opponents are distributed
    duplicateWeight: 0.2,       // Penalty for duplicate opponents
    compatibilityWeight: 0.3,   // Team compatibility scores
    balanceWeight: 0.2          // Block balance
  };
  
  // Calculate normalized scores (0-100)
  const crossBlockScore = (metrics.crossBlockCompatibility / 10) * 100;
  
  // Calculate duplicate opponent penalty (100 = no duplicates, 0 = all duplicates)
  const duplicateScore = metrics.totalTeams > 0 
    ? 100 - ((metrics.teamsWithDuplicateOpponents / metrics.totalTeams) * 100)
    : 100;
  
  // Calculate compatibility score (0-100)
  const compatibilityScore = Math.min(100, (metrics.averageCompatibilityScore / 10) * 100);
  
  // Calculate weighted sum
  const weightedScore = 
    crossBlockScore * weights.crossBlockWeight +
    duplicateScore * weights.duplicateWeight +
    compatibilityScore * weights.compatibilityWeight + 
    metrics.blockBalanceScore * weights.balanceWeight;
  
  // Return rounded score
  return Math.round(weightedScore);
};
