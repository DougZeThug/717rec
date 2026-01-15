import { useCallback, useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import {
  AlgorithmConfig,
  PairingResult,
  TeamPairing,
  TeamPairingMap,
  TimeBlockTeamsMap,
} from '@/types/autoSchedule';
import { generatePairingsWithBlossom } from '@/utils/autoSchedule/blossomPairingAlgorithm';
import { calculateDivisionOnlyCompatibility } from '@/utils/autoSchedule/compatibilityUtils';
import { getBackToBackPair, getPairConfig } from '@/utils/autoSchedule/constants';
import {
  fetchSeasonHistoryForTeams,
  haveTeamsPlayedBefore,
} from '@/utils/autoSchedule/matchHistoryService';
import { normalizeDate } from '@/utils/dateNormalization';
import { errorLog, scheduleLog, warnLog } from '@/utils/logger';
import { generateScheduleGreedy } from '@/utils/scheduling/greedyBackToBackScheduler';

import { useTeamsMap } from './teams';

/**
 * Hook to generate and manage team pairings for scheduling
 */
export const usePairingGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPairings, setGeneratedPairings] = useState<TeamPairingMap>({});
  const [unmatchedTeamIds, setUnmatchedTeamIds] = useState<string[]>([]);
  const [teamBlockMap, setTeamBlockMap] = useState<Record<string, string>>({});
  const { teams } = useTeamsMap();
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
      providedTeamBlockMap?: Record<string, string>
    ): Promise<PairingResult | null> => {
      setIsGenerating(true);

      try {
        // Use provided block map or build one from timeBlockTeams
        const blockMap = providedTeamBlockMap || {};
        if (!providedTeamBlockMap) {
          Object.entries(timeBlockTeams).forEach(([blockKey, teamsInBlock]) => {
            teamsInBlock?.forEach((team) => {
              blockMap[team.id] = blockKey;
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

        const pairings: TeamPairingMap = {};
        let allUnmatchedTeamIds: string[] = [];

        // Handle dual match mode with greedy back-to-back scheduler
        if (config.dualMatchMode) {
          scheduleLog('Using greedy back-to-back scheduler for dual match mode');

          // Find all pairs with teams
          const pairsWithTeams = Object.keys(timeBlockTeams).filter(
            (pairName) => timeBlockTeams[pairName]?.length > 0
          );

          if (pairsWithTeams.length === 0) {
            toast({
              title: 'No Teams Found',
              description: 'Please load teams for a specific date first.',
              variant: 'destructive',
            });
            return null;
          }

          scheduleLog(
            `Processing ${pairsWithTeams.length} back-to-back pairs: ${pairsWithTeams.join(', ')}`
          );

          // Fetch season history once for all teams
          const allTeamIds = new Set<string>();
          Object.values(timeBlockTeams).forEach((teamsInBlock) => {
            teamsInBlock?.forEach((team) => allTeamIds.add(team.id));
          });
          const historyPairs = await fetchSeasonHistoryForTeams(Array.from(allTeamIds));
          scheduleLog(`Season History Loaded: ${historyPairs.length} pairs`);

          // Process each back-to-back pair independently
          for (const pairName of pairsWithTeams) {
            const pairTeams = timeBlockTeams[pairName];
            if (!pairTeams || pairTeams.length === 0) continue;

            const pairConfig = getPairConfig(pairName);
            if (!pairConfig) {
              errorLog(`Invalid pair configuration for: ${pairName}`);
              continue;
            }

            // Get the specific timeslots for this pair
            const slots: [string, string] = [pairConfig.primary, pairConfig.secondary];
            // For odd teams, use the next slot after secondary (or fallback to secondary if none exists)
            const thirdSlot = getBackToBackPair(pairConfig.secondary) || pairConfig.secondary;

            scheduleLog(`Scheduling ${pairName} pair (${pairTeams.length} teams):`);
            scheduleLog(`   Timeslots: ${slots[0]} and ${slots[1]}`);

            // Log team tier assignments for this pair
            scheduleLog(`   Team Tier Assignments:`);
            pairTeams.forEach((team) => {
              const divisionName = (team.divisionName || '').toLowerCase();
              let tier = 2; // default
              if (divisionName.includes('competitive')) tier = 1;
              if (divisionName.includes('intermediate')) tier = 2;
              if (divisionName.includes('recreational')) tier = 3;
              scheduleLog(`     - ${team.name}: "${team.divisionName}" → Tier ${tier}`);
            });

            // Generate schedule for this specific pair with its specific timeslots
            const scheduledMatches = generateScheduleGreedy({
              teams: pairTeams,
              historyPairs,
              slots,
              thirdSlot,
              config: {
                maxTierGap: 1,
                byeStrategy: 'last',
              },
            });

            scheduleLog(`   Generated ${scheduledMatches.length} matches for ${pairName}`);

            // Convert scheduled matches to TeamPairingMap format
            for (const match of scheduledMatches) {
              const team1 = pairTeams.find((t) => t.id === match.teamAId);
              const team2 = pairTeams.find((t) => t.id === match.teamBId);

              if (!team1 || !team2) {
                warnLog(`Could not find teams for match: ${match.teamAId} vs ${match.teamBId}`);
                continue;
              }

              // 🛡️ DEFENSIVE VALIDATION: Ensure both teams are from the same block
              const team1Block = blockMap[match.teamAId];
              const team2Block = blockMap[match.teamBId];

              if (team1Block !== team2Block) {
                errorLog(`CROSS-BLOCK MATCH DETECTED:
  Team A: ${team1.name} (Block: ${team1Block})
  Team B: ${team2.name} (Block: ${team2Block})
  Expected Block: ${pairName}
  Timeslot: ${match.slot}`);
                continue; // Skip this invalid match
              }

              if (team1Block !== pairName || team2Block !== pairName) {
                warnLog(`BLOCK MISMATCH WARNING:
  Expected: ${pairName}
  Team A: ${team1.name} assigned to ${team1Block}
  Team B: ${team2.name} assigned to ${team2Block}`);
              }

              const pairing: TeamPairing = {
                team1,
                team2,
                compatibilityScore: match.tierA === match.tierB ? 10.0 : 5.0,
                hasPlayedBefore: false,
              };

              // Use the actual timeslot from the match (not the pair name)
              const timeslotKey = match.slot;
              if (!pairings[timeslotKey]) {
                pairings[timeslotKey] = [];
              }
              pairings[timeslotKey].push(pairing);
            }

            // Track unmatched teams for this pair
            const pairedTeamIds = new Set<string>();
            scheduledMatches.forEach((match) => {
              pairedTeamIds.add(match.teamAId);
              pairedTeamIds.add(match.teamBId);
            });

            const unmatchedInPair = pairTeams
              .filter((team) => !pairedTeamIds.has(team.id))
              .map((team) => team.id);

            if (unmatchedInPair.length > 0) {
              warnLog(`   Warning: ${unmatchedInPair.length} teams unmatched in ${pairName}`);
              allUnmatchedTeamIds.push(...unmatchedInPair);
            }
          }

          scheduleLog(
            `Total matches generated: ${Object.values(pairings).reduce((sum, p) => sum + p.length, 0)}`
          );
          scheduleLog(`   Timeslots used: ${Object.keys(pairings).join(', ')}`);
        } else {
          // Standard single-block pairing algorithm

          // Pre-fetch season history once for all teams (avoids N+1 queries)
          const allTeamIds = new Set<string>();
          Object.values(timeBlockTeams).forEach((teamsInBlock) => {
            teamsInBlock?.forEach((team) => allTeamIds.add(team.id));
          });
          const historyPairs = await fetchSeasonHistoryForTeams(Array.from(allTeamIds));
          scheduleLog(`Pre-fetched season history: ${historyPairs.length} pairs`);

          // Build Set for O(1) lookup
          const playedPairsSet = new Set<string>();
          historyPairs.forEach(([team1Id, team2Id]) => {
            const pairingKey = [team1Id, team2Id].sort().join('-');
            playedPairsSet.add(pairingKey);
          });

          for (const [block, teamsInBlock] of Object.entries(timeBlockTeams)) {
            // Skip empty blocks
            if (!teamsInBlock || teamsInBlock.length < 2) {
              scheduleLog(`Skipping empty block: ${block}`);
              continue;
            }

            // Skip blocks with odd number of teams (warn the user)
            if (teamsInBlock.length % 2 !== 0) {
              warnLog(
                `Block ${block} has odd number of teams (${teamsInBlock.length}). One team will be unmatched.`
              );
            }

            // Generate pairings for this time block
            scheduleLog(`Generating pairings for ${block} block with ${teamsInBlock.length} teams`);
            const blockPairings = await generatePairingsWithBlossom(teamsInBlock, {
              avoidRematches: config.avoidRematches,
              haveTeamsPlayedFn: haveTeamsPlayedBefore,
              getCompatibilityScoreFn: calculateDivisionOnlyCompatibility,
              weights: config.weights,
              playedPairsSet: playedPairsSet,
            });

            // Store pairings for this block
            pairings[block] = blockPairings;

            // Find unmatched teams
            const pairedTeamIds = new Set<string>();
            blockPairings.forEach((pair) => {
              pairedTeamIds.add(pair.team1.id);
              pairedTeamIds.add(pair.team2.id);
            });

            const blockUnmatchedTeams = teamsInBlock
              .filter((team) => !pairedTeamIds.has(team.id))
              .map((team) => team.id);

            allUnmatchedTeamIds = [...allUnmatchedTeamIds, ...blockUnmatchedTeams];
          }
        }

        // Store the generated pairings and unmatched teams
        setGeneratedPairings(pairings);
        setUnmatchedTeamIds(allUnmatchedTeamIds);

        // Return the generated pairings and unmatched team IDs
        return {
          pairings,
          unmatchedTeamIds: allUnmatchedTeamIds,
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
