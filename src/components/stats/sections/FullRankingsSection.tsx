
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Match } from "@/types";

interface FullRankingsSectionProps {
  matches: Match[];
}

const FullRankingsSection: React.FC<FullRankingsSectionProps> = ({ matches }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Full Team Rankings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          Full rankings table will be implemented here
          <br />
          <span className="text-xs">Based on {matches.filter(m => m.iscompleted).length} completed matches</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default FullRankingsSection;
