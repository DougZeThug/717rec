
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TimeBlockTeamsMap } from "@/types/autoSchedule";
import { TimeBlockHeader } from "./TimeBlockHeader";
import { TimeBlockTeamsList } from "./TimeBlockTeamsList";

interface SchedulePreviewProps {
  timeBlockTeams: TimeBlockTeamsMap;
  date: Date | null;
}

const SchedulePreview: React.FC<SchedulePreviewProps> = ({ 
  timeBlockTeams, 
  date 
}) => {
  // Check if we have teams loaded
  const hasTeams = Object.values(timeBlockTeams).some(teams => teams?.length > 0);
  
  if (!date || !hasTeams) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Select a date and load teams to preview schedule</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Teams Available by Time Block</h3>
      
      {Object.entries(timeBlockTeams).map(([block, teams]) => (
        <Card key={block} className="overflow-hidden">
          <TimeBlockHeader blockName={block} teamCount={teams.length} />
          <CardContent className="p-3">
            <TimeBlockTeamsList teams={teams} />
          </CardContent>
        </Card>
      ))}
      
      <div className="text-xs text-muted-foreground mt-4">
        Note: Teams will be paired based on compatibility scores
      </div>
    </div>
  );
};

export default SchedulePreview;
