
import { useCallback } from 'react';
import { TeamPairingMap, TimeBlockTeamsMap, PairingResult } from '@/types/autoSchedule';
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

  // Enhanced schedule generation with improved date handling
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
      // Enhanced logging for date debugging
      console.log("usePairingPreview - generateSchedule date:", {
        date,
        dateType: typeof date,
        dateObj: date instanceof Date,
        dateString: date.toString(),
        dateIso: date.toISOString(),
        dateTime: date.getTime(),
        simpleDateString: normalizeDate(date, 'generateSchedule')
      });
      
      // Create a safe date copy to ensure time is set to noon
      const safeDate = new Date(date);
      safeDate.setHours(12, 0, 0, 0);
      
      console.log('Using safe date for generating schedule:', {
        safeDate,
        safeDateString: safeDate.toString(),
        safeDateIso: safeDate.toISOString(),
        normalizedSafeDate: normalizeDate(safeDate, 'safeGenerateSchedule')
      });
      
      // Generate pairings with the provided options using the safe date
      const result = await generateMatchPairings(safeDate, timeBlockTeams, {
        avoidRematches: options.avoidRematches,
        weights: options.weights
      });
      
      // Update state with generated pairings
      if (result) {
        // Extract pairings and unmatchedTeamIds
        const { pairings, unmatchedTeamIds } = result;
        
        setGeneratedPairings(pairings);
        
        // Set the unmatched team IDs
        setUnmatchedTeamIds(unmatchedTeamIds || []);
          
        // Count total matches generated
        const totalMatches = Object.values(pairings).reduce((sum, blockPairings) => 
          sum + (Array.isArray(blockPairings) ? blockPairings.length : 0), 0);
          
        // Count any pairings that have played before
        const rematchCount = Object.values(pairings).reduce((sum, blockPairings) => {
          if (!Array.isArray(blockPairings)) return sum;
          return sum + blockPairings.filter(p => p.hasPlayedBefore).length;
        }, 0);
          
        let toastMessage = `${totalMatches} match pairings generated based on team compatibility.`;
        
        if (unmatchedTeamIds && unmatchedTeamIds.length > 0) {
          toastMessage += ` ${unmatchedTeamIds.length} teams were left unmatched due to odd numbers.`;
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
