
import React, { useEffect } from "react";
import { useAutoSchedule } from "@/hooks/useAutoSchedule/index";
import AutoScheduleHeader from "./AutoScheduleHeader";
import DateSettingsPanel from "./DateSettingsPanel";
import ScheduleWorkflowTabs from "./ScheduleWorkflowTabs";
import InformationSection from "./InformationSection";
import { DiagnosticPanel } from "./DiagnosticPanel";
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
    
    // Edit state
    editableMatches,
    isEditMode,
    setIsEditMode,
    validation,
    hasUnsavedEdits,
    
    // Data
    isLoading,
    isGenerating,
    isSaving,
    timeBlockTeams,
    originalTimeBlockTeams,
    teamBlockMap,
    setTimeBlockTeams,
    generatedPairings,
    unmatchedTeamIds,
    totalTeams,
    oddBlocks,
    
    // Actions
    handleLoadTeams,
    handleGenerateClick,
    handleApplySchedule,
    handleSaveSchedule,
    
    // Edit actions
    updateMatchTeam,
    updateMatchTimeslot,
    swapTeams,
    removeMatch,
    resetToGenerated,
    
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

  // Handle toggling edit mode
  const handleToggleEditMode = () => {
    // If entering edit mode and no editable matches exist, apply schedule first
    if (!isEditMode && editableMatches.length === 0 && Object.keys(generatedPairings).length > 0) {
      handleApplySchedule();
    }
    setIsEditMode(!isEditMode);
  };
  
  return (
    <div className="space-y-6">
      <AutoScheduleHeader />
      
      {/* Diagnostic Panel - Shows team-to-block assignments and validation */}
      <DiagnosticPanel 
        teamBlockMap={teamBlockMap || {}}
        timeBlockTeams={timeBlockTeams || {}}
        isVisible={totalTeams > 0}
      />
      
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
          originalTimeBlockTeams={originalTimeBlockTeams || {}}
          generatedPairings={generatedPairings || {}}
          generatedMatches={generatedMatches}
          unmatchedTeamIds={unmatchedTeamIds || []}
          isGenerating={isGenerating}
          oddBlocks={oddBlocks}
          totalTeams={totalTeams}
          matchQualityMetrics={matchQualityMetrics}
          dualMatchMode={dualMatchMode}
          onApplySchedule={handleApplySchedule}
          onSaveSchedule={handleSaveSchedule}
          isSaving={isSaving}
          onManualTeamAssign={handleManualTeamAssign}
          isEditMode={isEditMode}
          onToggleEditMode={handleToggleEditMode}
          editableMatches={editableMatches}
          validation={validation}
          onUpdateMatchTeam={updateMatchTeam}
          onUpdateMatchTimeslot={updateMatchTimeslot}
          onSwapTeams={swapTeams}
          onRemoveMatch={removeMatch}
          onResetEdits={resetToGenerated}
          hasUnsavedEdits={hasUnsavedEdits}
        />
      </div>
      
      <InformationSection />
    </div>
  );
};

export default AutoScheduleTab;
