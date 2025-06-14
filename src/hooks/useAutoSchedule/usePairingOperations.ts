
import { useState, useCallback } from 'react';
import { TeamPairingMap, TimeBlockTeamsMap, AlgorithmConfig, MatchQualityMetrics, AutoScheduleMatch } from '@/types/autoSchedule';
import { usePairingGenerator } from '@/hooks/usePairingGenerator';
import { useToast } from '@/hooks/use-toast';
import { validateScheduleDate } from '@/utils/autoSchedule/dateUtils';

export const usePairingOperations = (setActiveTab: (tab: string) => void) => {
  const [generatedPairings, setGeneratedPairings] = useState<TeamPairingMap>({});
  const [unmatchedTeamIds, setUnmatchedTeamIds] = useState<string[]>([]);
  const { isGenerating, generateMatchPairings } = usePairingGenerator();
  const { toast } = useToast();

  /**
   * Generate match pairings with enhanced validation and error handling
   */
  const handleGenerateClick = useCallback(async (
    selectedDate: Date | null,
    timeBlockTeams: TimeBlockTeamsMap,
    avoidRematches: boolean,
    prioritizeQuality: boolean,
    dualMatchMode: boolean,
    setIsProcessing: (loading: boolean) => void
  ) => {
    // Validate inputs
    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Please select a date first.",
        variant: "destructive"
      });
      return;
    }

    if (!validateScheduleDate(selectedDate, 'handleGenerateClick')) {
      toast({
        title: "Error",
        description: "Invalid date selected. Please choose a valid date.",
        variant: "destructive"
      });
      return;
    }

    // Check if we have teams loaded
    const totalTeams = Object.values(timeBlockTeams).reduce((sum, teams) => sum + teams.length, 0);
    if (totalTeams === 0) {
      toast({
        title: "Error",
        description: "No teams found for the selected date. Please load teams first or check if teams are assigned to time slots for this date.",
        variant: "destructive"
      });
      return;
    }

    console.log(`🎯 Starting pairing generation for ${totalTeams} teams with settings:`, {
      avoidRematches,
      prioritizeQuality,
      dualMatchMode,
      date: selectedDate.toISOString()
    });

    setIsProcessing(true);
    
    try {
      const config: AlgorithmConfig = {
        avoidRematches,
        prioritizeQuality,
        dualMatchMode,
        weights: prioritizeQuality ? {
          powerScoreWeight: 5,
          sosWeight: 3,
          recordWeight: 3.5,
          gameRecordWeight: 2
        } : undefined
      };

      const result = await generateMatchPairings(selectedDate, timeBlockTeams, config);
      
      if (result) {
        setGeneratedPairings(result.pairings);
        setUnmatchedTeamIds(result.unmatchedTeamIds);
        
        // Calculate some basic metrics
        const totalPairings = Object.values(result.pairings).reduce((sum, pairs) => sum + pairs.length, 0);
        
        console.log(`✅ Pairing generation complete:`, {
          totalPairings,
          unmatchedTeams: result.unmatchedTeamIds.length,
          blocks: Object.keys(result.pairings)
        });
        
        toast({
          title: "Schedule Generated",
          description: `Generated ${totalPairings} matches across ${Object.keys(result.pairings).length} time blocks. ${result.unmatchedTeamIds.length} teams remain unmatched.`,
        });
        
        // Move to matches tab to show results
        setActiveTab('matches');
      } else {
        toast({
          title: "Generation Failed",
          description: "Failed to generate schedule. Please check the console for details and try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error during pairing generation:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while generating the schedule. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [generateMatchPairings, toast, setActiveTab]);

  /**
   * Apply generated schedule with validation
   */
  const handleApplySchedule = useCallback((
    generatedPairings: TeamPairingMap,
    selectedDate: Date | null,
    dualMatchMode: boolean,
    setGeneratedMatches: (matches: AutoScheduleMatch[]) => void,
    setMatchQualityMetrics: (metrics: MatchQualityMetrics | null) => void
  ) => {
    if (!selectedDate) {
      toast({
        title: "Error",
        description: "No date selected for schedule application.",
        variant: "destructive"
      });
      return null;
    }

    if (!generatedPairings || Object.keys(generatedPairings).length === 0) {
      toast({
        title: "Error",
        description: "No generated schedule to apply. Please generate a schedule first.",
        variant: "destructive"
      });
      return null;
    }

    try {
      // Convert pairings to matches
      const matches: AutoScheduleMatch[] = [];
      let rematchCount = 0;
      let totalCompatibilityScore = 0;
      let pairingCount = 0;

      Object.entries(generatedPairings).forEach(([timeBlock, pairings]) => {
        pairings.forEach((pairing, index) => {
          matches.push({
            id: `${timeBlock}-${index}`,
            team1Id: pairing.team1.id,
            team2Id: pairing.team2.id,
            timeslot: timeBlock,
            date: selectedDate,
            blockType: dualMatchMode ? 'primary' : undefined
          });

          // Track metrics
          if (pairing.hasPlayedBefore) {
            rematchCount++;
          }
          totalCompatibilityScore += pairing.compatibilityScore;
          pairingCount++;
        });
      });

      // Calculate quality metrics
      const averageCompatibilityScore = pairingCount > 0 ? totalCompatibilityScore / pairingCount : 0;
      const qualityRating = averageCompatibilityScore > 80 ? 'Excellent' : 
                           averageCompatibilityScore > 60 ? 'Good' : 
                           averageCompatibilityScore > 40 ? 'Fair' : 'Poor';

      const metrics: MatchQualityMetrics = {
        totalMatches: matches.length,
        rematchCount,
        averageCompatibilityScore,
        qualityRating
      };

      setGeneratedMatches(matches);
      setMatchQualityMetrics(metrics);

      console.log(`✅ Applied schedule:`, {
        totalMatches: matches.length,
        rematchCount,
        averageCompatibilityScore: averageCompatibilityScore.toFixed(2),
        qualityRating
      });

      return matches;
    } catch (error) {
      console.error('❌ Error applying schedule:', error);
      toast({
        title: "Error",
        description: "Failed to apply the generated schedule. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  }, [toast]);

  return {
    isGenerating,
    generatedPairings,
    unmatchedTeamIds,
    handleGenerateClick,
    handleApplySchedule
  };
};
