
import React from "react";
import { TeamPairingMap } from "@/types/autoSchedule";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ScheduleMatchesPreview from "@/components/admin/batch-matches/auto-schedule/ScheduleMatchesPreview";

interface MatchesTabProps {
  selectedDate: Date | null;
  generatedPairings: TeamPairingMap;
  isGenerating: boolean;
  matchQualityMetrics: {
    totalMatches: number;
    rematchCount: number;
    averageCompatibilityScore: number;
    qualityRating: string;
  } | null;
  onApplySchedule: () => void;
}

const MatchesTab: React.FC<MatchesTabProps> = ({
  selectedDate,
  generatedPairings,
  isGenerating,
  matchQualityMetrics,
  onApplySchedule
}) => {
  const hasPairings = Object.keys(generatedPairings || {}).length > 0 &&
    Object.values(generatedPairings || {}).some(blockPairings => blockPairings?.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Generated Match Pairings</h3>
        
        {matchQualityMetrics && (
          <Badge variant={
            matchQualityMetrics.qualityRating === "Excellent" ? "recreational" :
            matchQualityMetrics.qualityRating === "Good" ? "intermediate" : "outline"
          }>
            {matchQualityMetrics.qualityRating} Quality
          </Badge>
        )}
      </div>
      
      <p className="text-sm text-muted-foreground">
        Review the generated match pairings based on team compatibility.
      </p>
      
      {hasPairings ? (
        <div className="space-y-4">
          <ScheduleMatchesPreview
            pairings={generatedPairings}
            date={selectedDate}
            isGenerating={isGenerating}
          />
          
          <div className="flex justify-end mt-4">
            <Button onClick={onApplySchedule}>
              Export to Match Form
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>Generate a schedule to see match pairings</p>
        </div>
      )}
    </div>
  );
};

export default MatchesTab;
