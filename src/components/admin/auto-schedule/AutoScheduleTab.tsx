
import React, { useEffect } from "react";
import { useAutoSchedule } from "@/hooks/useAutoSchedule/index";
import AutoScheduleHeader from "./AutoScheduleHeader";
import DateSettingsPanel from "./DateSettingsPanel";
import ScheduleWorkflowTabs from "./ScheduleWorkflowTabs";
import InformationSection from "./InformationSection";
import { TimeBlockTeamsMap } from "@/types/autoSchedule";

/**
 * AutoScheduleTab provides a workflow to generate and manage match schedules
 * automatically based on team assignments and compatibility scoring.
 */
const AutoScheduleTab = () => {
  const {
    // State
    selectedDate,
    setSelectedDate,
    activeTab,
    setActiveTab,
    avoidRematches,
    setAvoidRematches,
    prioritizeQuality,
    setPrioritizeQuality,
    dualMatchMode,
    setDualMatchMode,
    generatedMatches,
    matchQualityMetrics,
    
    // Data
    isLoading,
    isGenerating,
    timeBlockTeams,
    setTimeBlockTeams, // We need to expose this
    generatedPairings,
    unmatchedTeamIds,
    totalTeams,
    oddBlocks,
    
    // Actions
    handleLoadTeams,
    handleGenerateClick,
    handleApplySchedule,
    
    // Formatted utilities
    formattedDate
  } = useAutoSchedule();
  
  // Track tab changes for analytics
  useEffect(() => {
    console.log(`Auto schedule tab changed to: ${activeTab}`);
  }, [activeTab]);
  
  // Handle manual team assignment
  const handleManualTeamAssign = (updatedTeams: TimeBlockTeamsMap) => {
    console.log("Manually assigned teams:", updatedTeams);
    setTimeBlockTeams(updatedTeams);
  };
  
  return (
    <div className="space-y-6">
      <AutoScheduleHeader />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DateSettingsPanel 
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          avoidRematches={avoidRematches}
          setAvoidRematches={setAvoidRematches}
          prioritizeQuality={prioritizeQuality}
          setPrioritizeQuality={setPrioritizeQuality}
          dualMatchMode={dualMatchMode}
          setDualMatchMode={setDualMatchMode}
          isLoading={isLoading}
          isGenerating={isGenerating}
          totalTeams={totalTeams}
          oddBlocks={oddBlocks}
          formattedDate={formattedDate}
          onLoadTeams={handleLoadTeams}
          onGenerateSchedule={handleGenerateClick}
        />
        
        <ScheduleWorkflowTabs 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedDate={selectedDate}
          timeBlockTeams={timeBlockTeams || {}}
          generatedPairings={generatedPairings || {}}
          generatedMatches={generatedMatches}
          unmatchedTeamIds={unmatchedTeamIds || []}
          isGenerating={isGenerating}
          oddBlocks={oddBlocks}
          totalTeams={totalTeams}
          matchQualityMetrics={matchQualityMetrics}
          onApplySchedule={handleApplySchedule}
          onManualTeamAssign={handleManualTeamAssign}
        />
      </div>
      
      <InformationSection />
    </div>
  );
};

export default AutoScheduleTab;
