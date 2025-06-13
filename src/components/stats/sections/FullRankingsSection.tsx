
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FullRankingsSectionProps {
  // Define props if needed - currently none required
}

const FullRankingsSection: React.FC<FullRankingsSectionProps> = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Full Team Rankings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          Full rankings table will be implemented here
        </div>
      </CardContent>
    </Card>
  );
};

export default FullRankingsSection;
