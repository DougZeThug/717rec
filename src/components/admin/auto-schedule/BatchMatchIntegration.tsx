import { ArrowRight, FileText } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TeamPairingMap } from '@/types/autoSchedule';

interface BatchMatchIntegrationProps {
  generatedPairings: TeamPairingMap;
  selectedDate: Date | null;
  onExport: () => void;
  matchCount: number;
}

const BatchMatchIntegration = ({
  generatedPairings,
  selectedDate: _selectedDate,
  onExport,
  matchCount,
}: BatchMatchIntegrationProps) => {
  if (!generatedPairings || Object.keys(generatedPairings).length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-muted-foreground">No matches have been generated yet</p>
      </div>
    );
  }

  // Count total matches
  const totalMatches = Object.values(generatedPairings).reduce(
    (sum, blockPairings) => sum + blockPairings.length,
    0
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" /> Export to Batch Matches
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm">
            {matchCount > 0
              ? `${matchCount} matches ready to use in Batch Matches tab.`
              : `${totalMatches} match pairings generated and ready to export.`}
          </p>

          <Button onClick={onExport} className="w-full flex items-center justify-center">
            {matchCount > 0 ? 'View in Batch Matches Tab' : 'Export to Batch Matches'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchMatchIntegration;
