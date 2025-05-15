
import { useState } from 'react';
import { UseAutoScheduleState } from './types';

export const useAutoScheduleState = () => {
  // Tab state
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [activeTab, setActiveTab] = useState<string>("teams");
  
  // Algorithm settings
  const [avoidRematches, setAvoidRematches] = useState(true);
  const [prioritizeQuality, setPrioritizeQuality] = useState(false);
  const [dualMatchMode, setDualMatchMode] = useState(false);
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Generated data
  const [generatedMatches, setGeneratedMatches] = useState<UseAutoScheduleState['generatedMatches']>([]);
  const [matchQualityMetrics, setMatchQualityMetrics] = useState<UseAutoScheduleState['matchQualityMetrics']>(null);

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
    setMatchQualityMetrics
  };
};
