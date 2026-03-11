import { motion } from 'framer-motion';
import { Wand2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';

import { AlgorithmSettings } from './auto-schedule/components/AlgorithmSettings';
import { InfoFooter } from './auto-schedule/components/InfoFooter';
import { ScheduleHeader } from './auto-schedule/components/ScheduleHeader';
import { useAutoScheduleSection } from './auto-schedule/hooks/useAutoScheduleSection';
import { ScheduleGenerationStep } from './auto-schedule/ScheduleGenerationStep';
import { TeamLoadingStep } from './auto-schedule/TeamLoadingStep';
import { WarningDisplay } from './auto-schedule/WarningDisplay';
import { MatchPair } from './MatchPairsList';

interface AutoScheduleSectionProps {
  selectedDate: Date | null;
  matchPairs: MatchPair[];
  setMatchPairs: React.Dispatch<React.SetStateAction<MatchPair[]>>;
}

export const AutoScheduleSection: React.FC<AutoScheduleSectionProps> = ({
  selectedDate,
  _matchPairs,
  setMatchPairs,
}) => {
  const {
    // Algorithm settings
    avoidRematches,
    setAvoidRematches,
    prioritizeQuality,
    setPrioritizeQuality,

    // State
    autoScheduleStep,
    setAutoScheduleStep,
    isLoading,
    isGenerating,
    timeBlockTeams,
    generatedPairings,
    unmatchedTeamIds,
    totalTeams,
    oddBlocks,

    // Actions
    handlePreviewTeams,
    handleGenerateScheduleClick,
    handleApplySchedule,
  } = useAutoScheduleSection({ selectedDate, setMatchPairs });

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md border"
    >
      <ScheduleHeader totalTeams={totalTeams} oddBlocks={oddBlocks} />

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground mb-3">
          Generate matches automatically using teams assigned to time blocks for this date. For
          advanced features, use the dedicated Auto Schedule tab.
        </p>

        {/* Settings Accordion */}
        <AlgorithmSettings
          avoidRematches={avoidRematches}
          setAvoidRematches={setAvoidRematches}
          prioritizeQuality={prioritizeQuality}
          setPrioritizeQuality={setPrioritizeQuality}
        />

        <div className="flex flex-col space-y-4">
          {autoScheduleStep === 'teams' && (
            <TeamLoadingStep
              isLoading={isLoading}
              selectedDate={selectedDate}
              timeBlockTeams={timeBlockTeams}
              totalTeams={totalTeams}
              oddBlocks={oddBlocks}
              unmatchedTeamIds={unmatchedTeamIds}
              onLoadTeams={handlePreviewTeams}
              onGenerateSchedule={handleGenerateScheduleClick}
            />
          )}

          {autoScheduleStep === 'pairings' && Object.keys(generatedPairings || {}).length > 0 && (
            <ScheduleGenerationStep
              isGenerating={isGenerating}
              selectedDate={selectedDate}
              generatedPairings={generatedPairings}
              onApplySchedule={handleApplySchedule}
              onBack={() => setAutoScheduleStep('teams')}
            />
          )}
        </div>
      </div>

      <WarningDisplay oddBlocks={oddBlocks} unmatchedTeams={unmatchedTeamIds?.length || 0} />

      <InfoFooter />

      <div className="mt-4 flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => (window.location.href = '#auto-schedule')}
          className="flex items-center gap-1"
        >
          <Wand2 className="h-3.5 w-3.5" />
          Open Full Auto Schedule
        </Button>
      </div>
    </motion.div>
  );
};
