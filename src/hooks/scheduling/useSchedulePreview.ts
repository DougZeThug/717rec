import { useState } from 'react';

import { usePairingGenerator } from '@/hooks/scheduling/usePairingGenerator';
import { useTeamScheduleLoader } from '@/hooks/useTeamScheduleLoader';
import { useToast } from '@/hooks/useToast';
import { DualBlockConfig, PreviewResult } from '@/types/autoSchedule';
import { createTimeBlockPairs } from '@/utils/autoSchedule/dualBlockUtils';
import { normalizeDate } from '@/utils/dateNormalization';
import { errorLog, scheduleLog } from '@/utils/logger';
import { withTiming } from '@/utils/performance';

import { useDualBlockLogic } from './useDualBlockLogic';
import { useScheduleValidation } from './useScheduleValidation';
import { convertPairingsToMatches } from './utils/matchConversionUtils';

export type AutoScheduleStep = 'teams' | 'pairings';

/**
 * Main hook for managing schedule preview and auto-scheduling.
 * Orchestrates team loading, pairing generation, validation, and match conversion.
 */
export const useSchedulePreview = () => {
  const [autoScheduleStep, setAutoScheduleStep] = useState<AutoScheduleStep>('teams');
  const { toast } = useToast();

  // Sub-hooks
  const { isLoading, timeBlockTeams, loadTeamsForDate, getTeamCountStatus } =
    useTeamScheduleLoader();
  const { isGenerating, generatedPairings, unmatchedTeamIds, generateMatchPairings } =
    usePairingGenerator();
  const { pairedBlocks, setPairedBlocks, performTeamBalancing } = useDualBlockLogic();
  const { validateAndNotify } = useScheduleValidation();

  /**
   * Previews the schedule for a given date, loading teams and performing validation.
   * Handles both standard and dual-block mode scheduling.
   */
  const previewSchedule = async (
    date: Date,
    dualBlockMode = false,
    blockConfig?: DualBlockConfig
  ): Promise<PreviewResult | null> => {
    try {
      // Log the date being used
      scheduleLog('previewSchedule date:', {
        date,
        dateString: date.toString(),
        dateIso: date.toISOString(),
        simpleDateString: normalizeDate(date, 'useSchedulePreview'),
        dualBlockMode,
      });

      // Load teams for each time block if not loaded yet
      const teamsData =
        timeBlockTeams && Object.keys(timeBlockTeams).length > 0
          ? timeBlockTeams
          : await loadTeamsForDate(date, dualBlockMode, blockConfig);

      if (!teamsData) return null;

      // Process for dual block mode if enabled
      if (dualBlockMode && blockConfig) {
        // Create paired blocks structure
        const pairs = createTimeBlockPairs(teamsData, blockConfig);
        setPairedBlocks(pairs);

        // Get primary and secondary block names
        const primaryBlock = blockConfig.primaryBlock || 'Early';
        const secondaryBlock = blockConfig.secondaryBlock || 'Late';

        // Check if both blocks have teams
        if (!teamsData[primaryBlock] || !teamsData[secondaryBlock]) {
          toast({
            title: 'Warning',
            description: `Dual match mode requires teams in both ${primaryBlock} and ${secondaryBlock} blocks.`,
            variant: 'default',
          });
        }

        // Balance team counts if needed
        const { unmatchedTeamIds } = performTeamBalancing(teamsData, blockConfig);
        if (unmatchedTeamIds.length > 0) {
          toast({
            title: 'Notice',
            description: `${unmatchedTeamIds.length} team(s) are unmatched due to odd number of teams.`,
            variant: 'default',
          });
        }
      }

      // Validate team counts and show warnings
      const unmatchableBlocks = validateAndNotify(teamsData);

      return {
        date,
        timeBlocks: teamsData,
        unmatchableBlocks,
      };
    } catch (error) {
      errorLog('Error previewing schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to preview schedule. Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  };

  /**
   * Generates match schedule with pairings based on team compatibility.
   * Supports rematch avoidance, quality prioritization, and dual-match mode.
   */
  const handleGenerateSchedule = async (
    date: Date,
    options: {
      avoidRematches?: boolean;
      prioritizeQuality?: boolean;
      dualMatchMode?: boolean;
      weights?: {
        powerScoreWeight?: number;
        sosWeight?: number;
        recordWeight?: number;
        gameRecordWeight?: number;
      };
    } = {}
  ) => {
    if (!date) {
      toast({
        title: 'Select Date',
        description: 'Please select a date first.',
        variant: 'destructive',
      });
      return null;
    }

    // Check if teams have been loaded
    if (!timeBlockTeams || Object.keys(timeBlockTeams).length === 0) {
      toast({
        title: 'No Teams Loaded',
        description: 'Please preview the schedule first to load teams.',
        variant: 'destructive',
      });
      return null;
    }

    // Log the date being used
    scheduleLog('handleGenerateSchedule date:', {
      date,
      dateString: date.toString(),
      dateIso: date.toISOString(),
      simpleDateString: normalizeDate(date, 'handleGenerateSchedule'),
      dualMatchMode: options.dualMatchMode,
    });

    const result = await withTiming(
      async () => {
        // If in dual match mode, use the balanced teams
        let teamsToUse = timeBlockTeams;

        if (options.dualMatchMode) {
          // Create a dual block config from options
          const dualConfig: DualBlockConfig = {
            dualMatchMode: true,
            primaryBlock: 'Early',
            secondaryBlock: 'Late',
            unmatchedTeamStrategy: 'lowest-rank',
          };

          // Balance teams to ensure even counts
          const { balancedTeams } = performTeamBalancing(timeBlockTeams, dualConfig);
          teamsToUse = balancedTeams;

          scheduleLog('Using balanced teams for dual match mode:', teamsToUse);
        }

        return await generateMatchPairings(date, teamsToUse, {
          avoidRematches: options.avoidRematches,
          dualMatchMode: options.dualMatchMode,
          weights: options.weights,
        });
      },
      scheduleLog,
      'Schedule generation'
    );

    if (result) {
      const { pairings, unmatchedTeamIds } = result;

      // Count total matches generated
      const totalMatches = Object.values(pairings).reduce(
        (sum, blockPairings) => sum + blockPairings.length,
        0
      );

      // Count any pairings that have played before
      const rematchCount = Object.values(pairings).reduce(
        (sum, blockPairings) => sum + blockPairings.filter((p) => p.hasPlayedBefore).length,
        0
      );

      let toastMessage = `${totalMatches} match pairings generated based on team compatibility.`;

      if (unmatchedTeamIds.length > 0) {
        toastMessage += ` ${unmatchedTeamIds.length} teams were left unmatched due to odd numbers.`;
      }

      if (rematchCount > 0) {
        toastMessage += ` ${rematchCount} pairings are rematches.`;
      }

      toast({
        title: 'Schedule Generated',
        description: toastMessage,
      });

      setAutoScheduleStep('pairings');
      return pairings;
    }

    return null;
  };

  return {
    autoScheduleStep,
    setAutoScheduleStep,
    isLoading,
    isGenerating,
    timeBlockTeams,
    pairedBlocks,
    generatedPairings,
    unmatchedTeamIds,
    previewSchedule,
    handleGenerateSchedule,
    convertPairingsToMatches,
    getTeamCountStatus,
    performTeamBalancing,
  };
};
