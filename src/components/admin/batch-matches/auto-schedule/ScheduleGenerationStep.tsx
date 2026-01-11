import React from 'react';

import { Button } from '@/components/ui/button';
import { TeamPairingMap } from '@/types/autoSchedule';

import ScheduleMatchesPreview from './ScheduleMatchesPreview';

interface ScheduleGenerationStepProps {
  isGenerating: boolean;
  selectedDate: Date | null;
  generatedPairings: TeamPairingMap;
  onApplySchedule: () => void;
  onBack: () => void;
}

export const ScheduleGenerationStep: React.FC<ScheduleGenerationStepProps> = ({
  isGenerating,
  selectedDate,
  generatedPairings,
  onApplySchedule,
  onBack,
}) => {
  return (
    <div>
      <div className="flex items-center mb-2">
        <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">
          2
        </div>
        <h4 className="font-medium">Review Generated Matches</h4>
      </div>

      <div className="pl-8 mb-4">
        <p className="text-sm text-muted-foreground mb-3">
          Review the generated match pairings and apply them to the form
        </p>

        <ScheduleMatchesPreview
          pairings={generatedPairings}
          date={selectedDate}
          isGenerating={isGenerating}
        />

        <div className="mt-4 flex justify-between">
          <Button variant="outline" size="sm" onClick={onBack}>
            Back to Teams
          </Button>

          <Button variant="default" size="sm" onClick={onApplySchedule} disabled={isGenerating}>
            Apply Schedule to Form
          </Button>
        </div>
      </div>
    </div>
  );
};
