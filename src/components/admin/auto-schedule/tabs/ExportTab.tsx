
import React from "react";
import { Button } from "@/components/ui/button";

interface ExportTabProps {
  generatedMatches: any[];
}

const ExportTab: React.FC<ExportTabProps> = ({ generatedMatches }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Export Schedule</h3>
      <p className="text-sm text-muted-foreground">
        The generated schedule can now be used in the Batch Matches tab.
      </p>
      
      {generatedMatches.length > 0 ? (
        <div className="space-y-4">
          <div className="border rounded-md p-4 bg-muted/30">
            <p className="text-center font-medium">
              {generatedMatches.length} matches have been created
            </p>
            <p className="text-sm text-center text-muted-foreground mt-1">
              Go to the Batch Matches tab to view and edit them
            </p>
          </div>
          
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
