import { useState, useCallback } from 'react';
import { TeamPairingMap, TimeBlockTeamsMap, AlgorithmConfig, MatchQualityMetrics, AutoScheduleMatch } from '@/types/autoSchedule';
import { usePairingGenerator } from '@/hooks/usePairingGenerator';
import { useToast } from '@/hooks/use-toast';
import { validateScheduleDate } from '@/utils/autoSchedule/dateUtils';
import { calculateComprehensiveQualityMetrics, logQualityAnalysis } from '@/utils/autoSchedule/qualityAnalysis';

export const usePairingOperations = (setActiveTab: (tab: string) => void) => {
  const [generatedPairings, setGeneratedPairings] = useState<TeamPairingMap>({});
  const [unmatchedTeamIds, setUnmatchedTeamIds] = useState<string[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<MatchQualityMetrics | null>(null);
  const { isGenerating, generateMatchPairings } = usePairingGenerator();
  const { toast } = useToast();

  /**
   * Generate match pairings with enhanced quality analysis
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

    const startTime = performance.now();
    
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
        const generationTime = performance.now() - startTime;
        
        // Calculate comprehensive quality metrics
        const algorithmsUsed = [
          'standard',
          ...(avoidRematches ? ['rematch-avoidance'] : []),
          ...(prioritizeQuality ? ['quality-optimization'] : []),
          ...(dualMatchMode ? ['dual-block'] : [])
        ];
        
        const metrics = calculateComprehensiveQualityMetrics(
          result.pairings,
          generationTime,
          algorithmsUsed
        );
        
        // Log detailed analysis for debugging
        logQualityAnalysis(metrics, 'Pairing Generation Results');
        
        setGeneratedPairings(result.pairings);
        setUnmatchedTeamIds(result.unmatchedTeamIds);
        setQualityMetrics(metrics);
        
        // Enhanced toast with quality information
        const qualityInfo = metrics.qualityRating === 'Excellent' ? '🏆' :
                           metrics.qualityRating === 'Good' ? '✅' :
                           metrics.qualityRating === 'Fair' ? '⚠️' : '❌';
        
        console.log(`✅ Pairing generation complete:`, {
          totalPairings: metrics.totalMatches,
          unmatchedTeams: result.unmatchedTeamIds.length,
          blocks: Object.keys(result.pairings),
          qualityRating: metrics.qualityRating,
          diversityScore: metrics.opponentDiversity.diversityScore
        });
        
        toast({
          title: `Schedule Generated ${qualityInfo}`,
          description: `Generated ${metrics.totalMatches} ${metrics.qualityRating.toLowerCase()} quality matches. ${result.unmatchedTeamIds.length} teams unmatched. Diversity: ${metrics.opponentDiversity.diversityScore}%`,
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
   * Apply generated schedule with enhanced metrics
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

      // Use our comprehensive quality metrics if available
      if (qualityMetrics) {
        setMatchQualityMetrics(qualityMetrics);
        logQualityAnalysis(qualityMetrics, 'Applied Schedule Quality');
      } else {
        // Fallback to basic metrics calculation
        const metrics: MatchQualityMetrics = {
          totalMatches: matches.length,
          rematchCount,
          averageCompatibilityScore,
          qualityRating,
          opponentDiversity: { duplicateOpponents: 0, uniqueOpponents: 0, diversityScore: 0 },
          powerScoreAnalysis: { averagePowerScoreDifference: 0, balancedMatches: 0, unbalancedMatches: 0 },
          performanceMetrics: { generationTimeMs: 0, algorithmsUsed: ['basic'], optimizationLevel: 'basic' },
          feedback: { strengths: [], improvements: [], recommendations: [] }
        };
        setMatchQualityMetrics(metrics);
      }

      setGeneratedMatches(matches);

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
  }, [toast, qualityMetrics]);

  return {
    isGenerating,
    generatedPairings,
    unmatchedTeamIds,
    qualityMetrics,
    handleGenerateClick,
    handleApplySchedule
  };
};
