
import { useCallback } from 'react';
import { TeamPairingMap, TimeBlockTeamsMap } from '@/types/autoSchedule';
import { usePairingGenerator } from '../usePairingGenerator';
import { useToast } from '@/hooks/use-toast';
import { normalizeDate } from '@/utils/dateNormalization';
import { AlgorithmOptions } from './types';

export const usePairingPreview = (
  timeBlockTeams: TimeBlockTeamsMap,
  setGeneratedPairings: (pairings: TeamPairingMap) => void,
  setUnmatchedTeamIds: (ids: string[]) => void,
  setIsGenerating: (generating: boolean) => void,
  setAutoScheduleStep: (step: 'teams' | 'pairings') => void
) => {
  const { generateMatchPairings } = usePairingGenerator();
  const { toast } = useToast();

  // Generate schedule pairings
  const generateSchedule = useCallback(async (
    date: Date,
    options: AlgorithmOptions = {}
  ): Promise<void> => {
    if (!date) {
      toast({
        title: "Error",
        description: "Please select a date first",
        variant: "destructive"
      });
      return;
    }

    // Add performance tracking
    const startTime = performance.now();
    
    setIsGenerating(true);
    try {
      // Log the date being used
      console.log("usePairingPreview - generateSchedule date:", {
        date,
        dateString: date.toString(),
        dateIso: date.toISOString(),
        simpleDateString: normalizeDate(date, 'generateSchedule')
      });
      
      // Generate pairings with the provided options
      const pairings = await generateMatchPairings(date, timeBlockTeams, {
        avoidRematches: options.avoidRematches,
        weights: options.weights
      });
      
      // Update state with generated pairings
      if (pairings) {
        setGeneratedPairings(pairings);
        
        // Extract unmatchedTeamIds from the pairings object
        // Make sure we're getting an array of strings, not TeamPairing objects
        const unmatchedIds: string[] = Array.isArray(pairings.unmatchedTeamIds) 
          ? pairings.unmatchedTeamIds 
          : [];
        
        // Set the unmatched team IDs
        setUnmatchedTeamIds(unmatchedIds);
          
        // Count total matches generated
        const totalMatches = Object.values(pairings).reduce((sum, blockPairings) => 
          sum + (Array.isArray(blockPairings) ? blockPairings.length : 0), 0);
          
        // Count any pairings that have played before
        const rematchCount = Object.values(pairings).reduce((sum, blockPairings) => {
          if (!Array.isArray(blockPairings)) return sum;
          return sum + blockPairings.filter(p => p.hasPlayedBefore).length;
        }, 0);
          
        let toastMessage = `${totalMatches} match pairings generated based on team compatibility.`;
        
        if (unmatchedIds.length > 0) {
          toastMessage += ` ${unmatchedIds.length} teams were left unmatched due to odd numbers.`;
        }
        
        if (rematchCount > 0) {
          toastMessage += ` ${rematchCount} pairings are rematches.`;
        }
        
        toast({
          title: "Schedule Generated",
          description: toastMessage,
        });
        
        // Switch to pairings view
        setAutoScheduleStep('pairings');
      }
      
    } catch (error) {
      console.error('Error generating schedule:', error);
      toast({
        title: "Error",
        description: "Failed to generate schedule. Please try again.",
        variant: "destructive"
      });
    } finally {
      // Log performance metrics
      const endTime = performance.now();
      console.log(`Schedule generation took ${(endTime - startTime).toFixed(2)}ms`);
      
      setIsGenerating(false);
    }
  }, [
    timeBlockTeams, 
    generateMatchPairings, 
    setGeneratedPairings, 
    setUnmatchedTeamIds, 
    setIsGenerating, 
    setAutoScheduleStep, 
    toast
  ]);

  return {
    generateSchedule
  };
};
