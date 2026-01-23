import { useToast } from '@/hooks/use-toast';
import { TimeBlockTeamsMap } from '@/types/autoSchedule';
import { validateTeamCounts } from '@/utils/autoSchedule/edgeCaseUtils';

/**
 * Hook for validating team schedules and showing appropriate warnings.
 * Checks for odd team counts, insufficient blocks, and other scheduling issues.
 */
export const useScheduleValidation = () => {
  const { toast } = useToast();

  /**
   * Validates team counts and shows appropriate warnings for scheduling issues.
   * Returns unmatchable blocks (blocks with odd number of teams).
   */
  const validateAndNotify = (teamsData: TimeBlockTeamsMap): string[] => {
    // Validate team counts to identify insufficient and odd blocks
    const { insufficientBlocks } = validateTeamCounts(teamsData);

    // Check if we have even number of teams in each block
    const unmatchableBlocks: string[] = [];
    Object.entries(teamsData).forEach(([block, teams]) => {
      if (teams.length % 2 !== 0) {
        unmatchableBlocks.push(block);
      }
    });

    // Show warning for odd team blocks
    if (unmatchableBlocks.length > 0) {
      toast({
        title: 'Warning',
        description: `Blocks with odd number of teams: ${unmatchableBlocks.join(', ')}. Some teams may not get matched.`,
        variant: 'default',
      });
    }

    // Show warning for insufficient blocks
    if (insufficientBlocks.length > 0) {
      toast({
        title: 'Warning',
        description: `Blocks with insufficient teams: ${insufficientBlocks.join(', ')}. These blocks cannot create matches.`,
        variant: 'default',
      });
    }

    return unmatchableBlocks;
  };

  return {
    validateAndNotify,
  };
};
