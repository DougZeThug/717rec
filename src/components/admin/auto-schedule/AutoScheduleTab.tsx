
import React from "react";
import { useAutoSchedule } from "@/hooks/useAutoSchedule/index";
import AutoScheduleHeader from "./AutoScheduleHeader";
import DateSettingsPanel from "./DateSettingsPanel";
import ScheduleWorkflowTabs from "./ScheduleWorkflowTabs";
import InformationSection from "./InformationSection";

const AutoScheduleTab = () => {
  const {
    selectedDate,
    setSelectedDate,
    activeTab,
    setActiveTab,
    avoidRematches,
    setAvoidRematches,
    prioritizeQuality,
    setPrioritizeQuality,
    generatedMatches,
    isLoading,
    isGenerating,
    timeBlockTeams,
    generatedPairings,
    unmatchedTeamIds,
    totalTeams,
    oddBlocks,
    handleLoadTeams,
    handleGenerateClick,
    handleApplySchedule
  } = useAutoSchedule();
  
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
          isLoading={isLoading}
          isGenerating={isGenerating}
          totalTeams={totalTeams}
          oddBlocks={oddBlocks}
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
          onApplySchedule={handleApplySchedule}
        />
      </div>
      
      <InformationSection />
    </div>
  );
};

export default AutoScheduleTab;
