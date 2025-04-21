
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import CompactStandings from "@/components/stats/CompactStandings";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { Ranking } from "@/types";

interface StandingsSectionProps {
  topTeamsForRankings: Ranking[];
  onViewFullStandings: () => void;
}

const StandingsSection: React.FC<StandingsSectionProps> = ({ topTeamsForRankings, onViewFullStandings }) => (
  <Card className="mb-6">
    <CardHeader className="pb-2">
      <CardTitle>Current Standings</CardTitle>
      <CardDescription>Top 10 teams based on performance</CardDescription>
    </CardHeader>
    <CardContent>
      <CompactStandings rankings={topTeamsForRankings} />
      <div className="mt-4 text-center">
        <Button 
          onClick={onViewFullStandings}
          variant="outline"
          className="flex items-center gap-2"
        >
          View Full Standings
          <ArrowDown className="h-4 w-4" />
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default StandingsSection;
