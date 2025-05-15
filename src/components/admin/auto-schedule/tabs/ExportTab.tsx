
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MatchQualityMetrics } from "@/types/autoSchedule";

interface ExportTabProps {
  selectedDate: Date | null; // Added missing prop
  generatedMatches: any[] | null;
  matchQualityMetrics?: MatchQualityMetrics | null;
  onApplySchedule?: () => void;
}

const ExportTab: React.FC<ExportTabProps> = ({ 
  selectedDate, // Added missing prop
  generatedMatches, 
  matchQualityMetrics,
  onApplySchedule 
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Export Schedule</h3>
      <p className="text-sm text-muted-foreground">
        The generated schedule can now be used in the Batch Matches tab.
      </p>
      
      {generatedMatches && generatedMatches.length > 0 ? (
        <div className="space-y-4">
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
                  <Badge variant={
                    matchQualityMetrics.qualityRating === "Excellent" ? "recreational" :
                    matchQualityMetrics.qualityRating === "Good" ? "intermediate" : "outline"
                  }>
                    {matchQualityMetrics.qualityRating}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Avg Compatibility:</span>
                  <span className="font-medium">{matchQualityMetrics.averageCompatibilityScore.toFixed(1)}/10</span>
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
          
          <div className="flex justify-center mt-4">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = "#batch-matches"}
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
