
import React from "react";
import { Team } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import TeamLogo from "@/components/ui/team/TeamLogo";

interface SchedulePreviewProps {
  timeBlockTeams: Record<string, Team[]>;
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
          <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{block} Block</span>
            </div>
            <Badge variant={teams.length % 2 === 0 ? "outline" : "destructive"} className="text-xs">
              {teams.length} Teams {teams.length % 2 !== 0 && "(Odd Number)"}
            </Badge>
          </div>
          <CardContent className="p-3">
            {teams.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {teams.map(team => (
                  <div key={team.id} className="flex items-center gap-2 p-2 border rounded-md">
                    <TeamLogo src={team.logoUrl} alt={team.name} className="h-6 w-6" />
                    <span className="text-sm truncate">{team.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-2 text-sm text-muted-foreground">
                No teams assigned to this block
              </p>
            )}
          </CardContent>
        </Card>
      ))}
      
      <div className="text-xs text-muted-foreground mt-4">
        Note: Phase 1 implementation - team pairing algorithm will be added in Phase 2
      </div>
    </div>
  );
};

export default SchedulePreview;
