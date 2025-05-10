
import { useState } from 'react';
import { useTeamScheduleLoader } from '../useTeamScheduleLoader';
import { usePairingGenerator } from '../usePairingGenerator';
import { useSchedulePreview } from '../useSchedulePreview';
import { AlgorithmConfig, TimeBlockTeamsMap, TeamPairingMap } from '@/types/autoSchedule';

export function useAutoSchedule() {
  // Tab state
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [activeTab, setActiveTab] = useState<string>("teams");
  
  // Algorithm settings
  const [avoidRematches, setAvoidRematches] = useState(true);
  const [prioritizeQuality, setPrioritizeQuality] = useState(false);
  
  // Generated data
  const [generatedMatches, setGeneratedMatches] = useState<any[]>([]);
  
  // Use existing hooks
  const {
    autoScheduleStep,
    setAutoScheduleStep,
    isLoading,
    isGenerating,
    timeBlockTeams,
    generatedPairings,
    unmatchedTeamIds,
    previewSchedule,
    handleGenerateSchedule,
    convertPairingsToMatches,
    getTeamCountStatus
  } = useSchedulePreview();

  const handleLoadTeams = async () => {
    if (!selectedDate) return;
    await previewSchedule(selectedDate);
  };

  const handleGenerateClick = async () => {
    if (!selectedDate) return;
    
    await handleGenerateSchedule(selectedDate, {
      avoidRematches,
      prioritizeQuality,
      weights: prioritizeQuality ? {
        powerScoreWeight: 5,
        recordWeight: 3.5
      } : undefined
    });
    
    setActiveTab("matches");
  };

  const handleApplySchedule = () => {
    if (!generatedPairings || !selectedDate) return;
    
    const matches = convertPairingsToMatches(generatedPairings, selectedDate);
    setGeneratedMatches(matches);
    
    // Show the export tab with the created matches
    setActiveTab("export");
  };

  const { total: totalTeams, odd: oddBlocks } = getTeamCountStatus();

  return {
    // State
    selectedDate,
    setSelectedDate,
    activeTab,
    setActiveTab,
    avoidRematches,
    setAvoidRematches,
    prioritizeQuality,
    setPrioritizeQuality,
    generatedMatches,
    
    // Data
    isLoading,
    isGenerating,
    timeBlockTeams,
    generatedPairings,
    unmatchedTeamIds,
    totalTeams,
    oddBlocks,
    
    // Actions
    handleLoadTeams,
    handleGenerateClick,
    handleApplySchedule
  };
}
