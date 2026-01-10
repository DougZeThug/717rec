import { Team } from '@/types';
import { MatchQualityMetrics, TeamPair, TeamPairingMap } from '@/types/autoSchedule';
import { scheduleLog } from '@/utils/logger';

/**
 * Analyze opponent diversity across all pairings
 */
export function analyzeOpponentDiversity(pairings: TeamPairingMap): {
  duplicateOpponents: number;
  uniqueOpponents: number;
  diversityScore: number;
} {
  const teamOpponents = new Map<string, Set<string>>();
  let totalPairings = 0;

  // Track all opponents for each team
  Object.values(pairings).forEach((blockPairings) => {
    blockPairings.forEach((pairing) => {
      totalPairings++;

      // Track team1's opponents
      if (!teamOpponents.has(pairing.team1.id)) {
        teamOpponents.set(pairing.team1.id, new Set());
      }
      teamOpponents.get(pairing.team1.id)!.add(pairing.team2.id);

      // Track team2's opponents
      if (!teamOpponents.has(pairing.team2.id)) {
        teamOpponents.set(pairing.team2.id, new Set());
      }
      teamOpponents.get(pairing.team2.id)!.add(pairing.team1.id);
    });
  });

  // Calculate diversity metrics
  const totalUniqueOpponents = Array.from(teamOpponents.values()).reduce(
    (sum, opponents) => sum + opponents.size,
    0
  );

  const maxPossibleOpponents = totalPairings * 2; // Each pairing creates 2 opponent relationships
  const duplicateOpponents = maxPossibleOpponents - totalUniqueOpponents;

  // Diversity score: percentage of unique opponent relationships
  const diversityScore =
    maxPossibleOpponents > 0
      ? Math.round((totalUniqueOpponents / maxPossibleOpponents) * 100)
      : 100;

  return {
    duplicateOpponents,
    uniqueOpponents: totalUniqueOpponents,
    diversityScore,
  };
}

/**
 * Analyze power score balance in pairings
 */
export function analyzePowerScoreBalance(pairings: TeamPairingMap): {
  averagePowerScoreDifference: number;
  balancedMatches: number;
  unbalancedMatches: number;
} {
  let totalDifference = 0;
  let balancedMatches = 0;
  let unbalancedMatches = 0;
  let totalMatches = 0;

  const BALANCED_THRESHOLD = 2.0; // Power score difference threshold for "balanced"

  Object.values(pairings).forEach((blockPairings) => {
    blockPairings.forEach((pairing) => {
      const team1Power = pairing.team1.power_score || 0;
      const team2Power = pairing.team2.power_score || 0;
      const difference = Math.abs(team1Power - team2Power);

      totalDifference += difference;
      totalMatches++;

      if (difference <= BALANCED_THRESHOLD) {
        balancedMatches++;
      } else {
        unbalancedMatches++;
      }
    });
  });

  return {
    averagePowerScoreDifference: totalMatches > 0 ? totalDifference / totalMatches : 0,
    balancedMatches,
    unbalancedMatches,
  };
}

/**
 * Analyze cross-block diversity for dual block schedules
 */
export function analyzeCrossBlockDiversity(pairings: TeamPairingMap): number {
  const blocks = Object.keys(pairings);
  if (blocks.length < 2) return 100; // Single block is perfectly diverse

  const teamOpponentsByBlock = new Map<string, Map<string, Set<string>>>();

  // Group opponents by team and block
  Object.entries(pairings).forEach(([block, blockPairings]) => {
    if (!teamOpponentsByBlock.has(block)) {
      teamOpponentsByBlock.set(block, new Map());
    }

    const blockOpponents = teamOpponentsByBlock.get(block)!;

    blockPairings.forEach((pairing) => {
      // Track team1's opponents in this block
      if (!blockOpponents.has(pairing.team1.id)) {
        blockOpponents.set(pairing.team1.id, new Set());
      }
      blockOpponents.get(pairing.team1.id)!.add(pairing.team2.id);

      // Track team2's opponents in this block
      if (!blockOpponents.has(pairing.team2.id)) {
        blockOpponents.set(pairing.team2.id, new Set());
      }
      blockOpponents.get(pairing.team2.id)!.add(pairing.team1.id);
    });
  });

  // Calculate cross-block diversity
  let totalTeams = 0;
  let teamsWithDifferentOpponents = 0;

  const allTeams = new Set<string>();
  teamOpponentsByBlock.forEach((blockOpponents) => {
    blockOpponents.forEach((_, teamId) => allTeams.add(teamId));
  });

  allTeams.forEach((teamId) => {
    const blockOpponentSets = Array.from(teamOpponentsByBlock.values())
      .map((blockOpponents) => blockOpponents.get(teamId) || new Set())
      .filter((opponentSet) => opponentSet.size > 0);

    if (blockOpponentSets.length > 1) {
      totalTeams++;

      // Check if opponents are different across blocks
      const hasOverlap = blockOpponentSets.some((set1, i) =>
        blockOpponentSets.some(
          (set2, j) => i !== j && Array.from(set1).some((opponent) => set2.has(opponent))
        )
      );

      if (!hasOverlap) {
        teamsWithDifferentOpponents++;
      }
    }
  });

  return totalTeams > 0 ? Math.round((teamsWithDifferentOpponents / totalTeams) * 100) : 100;
}

/**
 * Generate actionable feedback based on quality analysis
 */
export function generateQualityFeedback(metrics: MatchQualityMetrics): {
  strengths: string[];
  improvements: string[];
  recommendations: string[];
} {
  const strengths: string[] = [];
  const improvements: string[] = [];
  const recommendations: string[] = [];

  // Analyze strengths
  if (metrics.rematchCount === 0) {
    strengths.push('No repeat matchups - excellent opponent variety');
  }

  if (metrics.opponentDiversity.diversityScore >= 90) {
    strengths.push('Outstanding opponent diversity across all matches');
  }

  if (metrics.powerScoreAnalysis.balancedMatches > metrics.powerScoreAnalysis.unbalancedMatches) {
    strengths.push('Most matches are well-balanced by team strength');
  }

  if (metrics.averageCompatibilityScore >= 7) {
    strengths.push('High overall match quality and competitiveness');
  }

  // Identify improvements
  if (metrics.rematchCount > 0) {
    improvements.push(`${metrics.rematchCount} repeat matchups could be avoided`);
  }

  if (metrics.opponentDiversity.diversityScore < 70) {
    improvements.push('Opponent diversity could be improved');
  }

  if (metrics.powerScoreAnalysis.unbalancedMatches > metrics.powerScoreAnalysis.balancedMatches) {
    improvements.push('Many matches have significant skill gaps');
  }

  if (metrics.blockAnalysis && metrics.blockAnalysis.crossBlockDiversity < 80) {
    improvements.push('Teams face similar opponents across different time blocks');
  }

  // Provide recommendations
  if (metrics.rematchCount > 0) {
    recommendations.push("Enable 'Avoid Rematches' setting for better opponent variety");
  }

  if (metrics.powerScoreAnalysis.averagePowerScoreDifference > 3) {
    recommendations.push("Enable 'Prioritize Quality' for more balanced matches");
  }

  if (metrics.opponentDiversity.diversityScore < 60) {
    recommendations.push('Consider manual adjustments to increase opponent variety');
  }

  if (metrics.totalMatches < 5) {
    recommendations.push('More teams needed for optimal schedule generation');
  }

  return { strengths, improvements, recommendations };
}

/**
 * Calculate comprehensive quality metrics for generated pairings
 */
export function calculateComprehensiveQualityMetrics(
  pairings: TeamPairingMap,
  generationTimeMs: number = 0,
  algorithmsUsed: string[] = ['standard']
): MatchQualityMetrics {
  // Basic metrics
  let totalMatches = 0;
  let rematchCount = 0;
  let totalCompatibilityScore = 0;

  Object.values(pairings).forEach((blockPairings) => {
    totalMatches += blockPairings.length;
    blockPairings.forEach((pairing) => {
      totalCompatibilityScore += pairing.compatibilityScore;
      if (pairing.hasPlayedBefore) {
        rematchCount++;
      }
    });
  });

  const averageCompatibilityScore = totalMatches > 0 ? totalCompatibilityScore / totalMatches : 0;

  // Quality rating
  const qualityRating =
    averageCompatibilityScore >= 8
      ? 'Excellent'
      : averageCompatibilityScore >= 6
        ? 'Good'
        : averageCompatibilityScore >= 4
          ? 'Fair'
          : 'Poor';

  // Enhanced analysis
  const opponentDiversity = analyzeOpponentDiversity(pairings);
  const powerScoreAnalysis = analyzePowerScoreBalance(pairings);

  // Block analysis for dual-block schedules
  const blocks = Object.keys(pairings);
  const blockAnalysis =
    blocks.length > 1
      ? {
          primaryBlockQuality: calculateBlockQuality(pairings[blocks[0]] || []),
          secondaryBlockQuality: calculateBlockQuality(pairings[blocks[1]] || []),
          crossBlockDiversity: analyzeCrossBlockDiversity(pairings),
        }
      : undefined;

  // Performance metrics
  const performanceMetrics = {
    generationTimeMs,
    algorithmsUsed,
    optimizationLevel: 'standard' as const,
  };

  // Generate feedback
  const baseMetrics: MatchQualityMetrics = {
    totalMatches,
    rematchCount,
    averageCompatibilityScore,
    qualityRating,
    opponentDiversity,
    powerScoreAnalysis,
    blockAnalysis,
    performanceMetrics,
    feedback: { strengths: [], improvements: [], recommendations: [] },
  };

  const feedback = generateQualityFeedback(baseMetrics);

  return {
    ...baseMetrics,
    feedback,
  };
}

/**
 * Calculate quality score for a single block of pairings
 */
function calculateBlockQuality(blockPairings: TeamPair[]): number {
  if (blockPairings.length === 0) return 0;

  const totalScore = blockPairings.reduce((sum, pairing) => sum + pairing.compatibilityScore, 0);
  return totalScore / blockPairings.length;
}

/**
 * Log detailed quality analysis for debugging
 */
export function logQualityAnalysis(
  metrics: MatchQualityMetrics,
  label: string = 'Quality Analysis'
): void {
  scheduleLog(`${label}:`, {
    overall: `${metrics.qualityRating} (${metrics.averageCompatibilityScore.toFixed(1)}/10)`,
    matches: `${metrics.totalMatches} total, ${metrics.rematchCount} rematches`,
    diversity: `${metrics.opponentDiversity.diversityScore}% (${metrics.opponentDiversity.duplicateOpponents} duplicates)`,
    balance: `${metrics.powerScoreAnalysis.balancedMatches}/${metrics.totalMatches} balanced matches`,
    blocks: metrics.blockAnalysis
      ? {
          primary: metrics.blockAnalysis.primaryBlockQuality.toFixed(1),
          secondary: metrics.blockAnalysis.secondaryBlockQuality.toFixed(1),
          crossBlockDiversity: `${metrics.blockAnalysis.crossBlockDiversity}%`,
        }
      : undefined,
    performance: `${metrics.performanceMetrics.generationTimeMs}ms using ${metrics.performanceMetrics.algorithmsUsed.join(', ')}`,
    strengths: metrics.feedback.strengths,
    improvements: metrics.feedback.improvements,
    recommendations: metrics.feedback.recommendations,
  });
}
