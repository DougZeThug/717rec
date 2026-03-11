import { AlertCircle, Database, Save } from 'lucide-react';
import React from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MatchQualityMetrics } from '@/types/autoSchedule';
import type { ScheduledMatch } from '@/types/schedule';

interface ExportTabProps {
  selectedDate: Date | null;
  generatedMatches: ScheduledMatch[] | null;
  matchQualityMetrics?: MatchQualityMetrics | null;
  onApplySchedule?: () => void;
  onSaveSchedule?: () => Promise<boolean>;
  isSaving?: boolean;
  hasUnsavedEdits?: boolean;
}

const ExportTab: React.FC<ExportTabProps> = ({
  _selectedDate,
  generatedMatches,
  matchQualityMetrics,
  _onApplySchedule,
  onSaveSchedule,
  isSaving = false,
  hasUnsavedEdits = false,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Export Schedule</h3>
      <p className="text-sm text-muted-foreground">
        The generated schedule can now be used in the Batch Matches tab.
      </p>

      {generatedMatches && generatedMatches.length > 0 ? (
        <div className="space-y-4">
          {hasUnsavedEdits && (
            <Alert
              variant="default"
              className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
            >
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900 dark:text-amber-100">
                You have unsaved edits to the schedule. Make sure to save before leaving!
              </AlertDescription>
            </Alert>
          )}

          <div className="border rounded-md p-4 bg-muted/30">
            <p className="text-center font-medium">
              {generatedMatches.length} matches have been created
            </p>
            <p className="text-sm text-center text-muted-foreground mt-1">
              Go to the Batch Matches tab to view and edit them
            </p>
          </div>

          {matchQualityMetrics && (
            <div className="border rounded-md p-4">
              <h4 className="text-sm font-medium mb-2">Schedule Quality Report</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Quality Rating:</span>
                  <Badge
                    variant={
                      matchQualityMetrics.qualityRating === 'Excellent'
                        ? 'recreational'
                        : matchQualityMetrics.qualityRating === 'Good'
                          ? 'intermediate'
                          : 'outline'
                    }
                  >
                    {matchQualityMetrics.qualityRating}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Avg Compatibility:</span>
                  <span className="font-medium">
                    {matchQualityMetrics.averageCompatibilityScore.toFixed(1)}/10
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Matches:</span>
                  <span className="font-medium">{matchQualityMetrics.totalMatches}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rematches:</span>
                  <span className="font-medium">{matchQualityMetrics.rematchCount}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 mt-4">
            <Button onClick={onSaveSchedule} disabled={isSaving} className="w-full">
              {isSaving ? (
                <>
                  <Database className="mr-2 h-4 w-4 animate-pulse" />
                  Saving to Database...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Schedule to Database
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => (window.location.href = '#batch-matches')}
              className="w-full"
            >
              Go to Batch Matches
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>Export the generated schedule first</p>
        </div>
      )}
    </div>
  );
};

export default ExportTab;
