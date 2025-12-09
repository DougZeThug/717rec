
import { useState } from 'react';
import { UseAutoScheduleState } from './types';
import { AutoScheduleMatch } from '@/types/autoSchedule';

export const useAutoScheduleState = () => {
  // Tab state
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [activeTab, setActiveTab] = useState<string>("teams");
  
  // Algorithm settings
  const [avoidRematches, setAvoidRematches] = useState(true);
  const [prioritizeQuality, setPrioritizeQuality] = useState(false);
  const [dualMatchMode, setDualMatchMode] = useState(true);
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Generated data
  const [generatedMatches, setGeneratedMatches] = useState<UseAutoScheduleState['generatedMatches']>([]);
  const [matchQualityMetrics, setMatchQualityMetrics] = useState<UseAutoScheduleState['matchQualityMetrics']>(null);
  
  // Editable matches state
  const [editableMatches, setEditableMatches] = useState<AutoScheduleMatch[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Team block mapping for validation
  const [teamBlockMap, setTeamBlockMap] = useState<Record<string, string>>({});

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
    dualMatchMode,
    setDualMatchMode,
    isProcessing,
    setIsProcessing,
    generatedMatches,
    setGeneratedMatches,
    matchQualityMetrics,
    setMatchQualityMetrics,
    editableMatches,
    setEditableMatches,
    isEditMode,
    setIsEditMode,
    teamBlockMap,
    setTeamBlockMap
  };
};
