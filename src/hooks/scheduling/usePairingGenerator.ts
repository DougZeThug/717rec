import { useCallback, useState } from 'react';

import { useToast } from '@/hooks/useToast';
import {
  AlgorithmConfig,
  PairingResult,
  SchedulingDiagnostics,
  TeamPairingMap,
  TimeBlockTeamsMap,
} from '@/types/autoSchedule';
import { fetchSeasonHistoryForTeams } from '@/utils/autoSchedule/matchHistoryService';
import { normalizeDate } from '@/utils/dateNormalization';
import { errorLog, scheduleLog } from '@/utils/logger';

import { useTeamsMap } from '../teams';
import { scheduleDualBlockPairings } from './utils/dualBlockScheduler';
import { scheduleStandardPairings } from './utils/standardPairing';

/**
 * Hook to generate and manage team pairings for scheduling
 */
export const usePairingGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPairings, setGeneratedPairings] = useState<TeamPairingMap>({});
  const [unmatchedTeamIds, setUnmatchedTeamIds] = useState<string[]>([]);
  // Maps team ID to array of block names (supports double headers in multiple blocks)
  const [teamBlockMap, setTeamBlockMap] = useState<Record<string, string[]>>({});
  const { _teams } = useTeamsMap();
  const { toast } = useToast();

  /**
   * Generate match pairings for teams
   *
   * Two modes:
   * 1. Dual Match Mode (config.dualMatchMode = true):
   *    Uses greedy back-to-back scheduler for consecutive timeslots (S1, S2, optional S3)
   *    - Faster and deterministic
   *    - Prioritizes same-division, no rematches
   *    - Handles odd teams by creating a third slot
   *    - Quality optimization not applicable
   *
   * 2. Standard Mode (config.dualMatchMode = false):
   *    Uses Edmonds' Blossom algorithm for optimal quality matching
   *    - Maximizes compatibility scores
   *    - Supports quality optimization weights
   *    - Each time block scheduled independently
   */
  const generateMatchPairings = useCallback(
    async (
      date: Date,
      timeBlockTeams: TimeBlockTeamsMap,
      config: AlgorithmConfig = {},
      // Maps team ID to array of block names (supports double headers in multiple blocks)
      providedTeamBlockMap?: Record<string, string[]>
    ): Promise<PairingResult | null> => {
      setIsGenerating(true);

      try {
        // Use provided block map or build one from timeBlockTeams
        // Block map now uses arrays to support double header teams in multiple blocks
        // IMPORTANT: Check if provided map is non-empty, not just truthy (empty objects are truthy)
        const hasProvidedBlockMap =
          providedTeamBlockMap && Object.keys(providedTeamBlockMap).length > 0;
        const blockMap: Record<string, string[]> = hasProvidedBlockMap
          ? { ...providedTeamBlockMap }
          : {};
        if (!hasProvidedBlockMap) {
          Object.entries(timeBlockTeams).forEach(([blockKey, teamsInBlock]) => {
            teamsInBlock?.forEach((team) => {
              if (!blockMap[team.id]) {
                blockMap[team.id] = [];
              }
              if (!blockMap[team.id].includes(blockKey)) {
                blockMap[team.id].push(blockKey);
              }
            });
          });
        }
        setTeamBlockMap(blockMap);

        scheduleLog('Generating match pairings for:', {
          date: normalizeDate(date, 'generateMatchPairings'),
          teamCount: Object.values(timeBlockTeams).reduce(
            (sum, teamsInBlock) => sum + teamsInBlock.length,
            0
          ),
          config,
          blockMapSize: Object.keys(blockMap).length,
        });

        // Fetch season history once for all teams
        const allTeamIds = new Set<string>();
        Object.values(timeBlockTeams).forEach((teamsInBlock) => {
          teamsInBlock?.forEach((team) => allTeamIds.add(team.id));
        });
        const historyPairs = await fetchSeasonHistoryForTeams(Array.from(allTeamIds));
        scheduleLog(`Season History Loaded: ${historyPairs.length} pairs`);

        let pairings: TeamPairingMap;
        let allUnmatchedTeamIds: string[];
        let aggregateDiagnostics: SchedulingDiagnostics | undefined;

        // Handle dual match mode with greedy back-to-back scheduler
        if (config.dualMatchMode) {
          const result = await scheduleDualBlockPairings(
            timeBlockTeams,
            config,
            blockMap,
            historyPairs,
            toast
          );
          pairings = result.pairings;
          allUnmatchedTeamIds = result.unmatchedTeamIds;
          aggregateDiagnostics = result.diagnostics;

          // Log summary of diagnostics if any relaxation was applied
          if (aggregateDiagnostics.relaxationApplied > 0 || aggregateDiagnostics.repairAttempted) {
            scheduleLog(
              `📊 Scheduling completed with constraint adjustments: ` +
                `relaxation level ${aggregateDiagnostics.relaxationApplied}, ` +
                `constraints relaxed: [${aggregateDiagnostics.constraintsRelaxed.join(', ') || 'none'}], ` +
                `repair attempted: ${aggregateDiagnostics.repairAttempted}`
            );
          }
        } else {
          // Standard single-block pairing algorithm
          const result = await scheduleStandardPairings(timeBlockTeams, config, historyPairs);
          pairings = result.pairings;
          allUnmatchedTeamIds = result.unmatchedTeamIds;
        }

        // Store the generated pairings and unmatched teams
        setGeneratedPairings(pairings);
        setUnmatchedTeamIds(allUnmatchedTeamIds);

        // Return the generated pairings, unmatched team IDs, and diagnostics
        return {
          pairings,
          unmatchedTeamIds: allUnmatchedTeamIds,
          diagnostics: aggregateDiagnostics,
        };
      } catch (error) {
        errorLog('Error generating match pairings:', error);
        toast({
          title: 'Error',
          description: 'Failed to generate match pairings. Please try again.',
          variant: 'destructive',
        });
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [toast]
  );

  return {
    isGenerating,
    generatedPairings,
    unmatchedTeamIds,
    teamBlockMap,
    generateMatchPairings,
  };
};
