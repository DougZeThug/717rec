
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TeamTimeslot } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { Link } from "react-router-dom";
import { gradients, interactive, animations, getDivisionStyles } from "@/styles/designSystem";
import { cn } from "@/lib/utils";

interface TimeslotGroupingProps {
  groupedTimeslots: Record<string, TeamTimeslot[]>;
  isLoading: boolean;
}

const TimeslotGrouping: React.FC<TimeslotGroupingProps> = ({ 
  groupedTimeslots, 
  isLoading 
}) => {
  if (isLoading) {
    return (
      <div className="text-center py-4">
        <p className="animate-soft-pulse">Loading timeslots...</p>
      </div>
    );
  }
  
  if (Object.keys(groupedTimeslots).length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-gray-500">No timeslots scheduled for this date.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {Object.entries(groupedTimeslots).map(([timeslot, teams], index) => (
        <Card 
          key={timeslot} 
          className={cn(
            "overflow-hidden border-gray-200 dark:border-gray-700 transition-all duration-300",
            "hover:shadow-md",
            animations.entranceLeft,
            `animation-delay-${index * 100}`
          )}
        >
          <div className={cn(
            "bg-cornhole-navy text-white px-4 py-3 font-medium",
            "bg-gradient-to-r from-cornhole-navy to-cornhole-navy/90"
          )}>
            {timeslot}
          </div>
          <CardContent className="py-4">
            <div className="space-y-1">
              {teams.map((teamTimeslot, teamIndex) => (
                <div 
                  key={teamTimeslot.id} 
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-md",
                    interactive.row.hover,
                    animations.fadeInSlideUp,
                    `animation-delay-${teamIndex * 100 + 100}`
                  )}
                >
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 mr-3">
                      <Users className="h-4 w-4 text-gray-500" />
                    </div>
                    
                    <div className="flex flex-col">
                      {teamTimeslot.teams?.name ? (
                        <Link 
                          to={`/teams/${teamTimeslot.team_id}`}
                          className={cn(
                            "font-medium text-cornhole-navy dark:text-white",
                            "hover:underline transition-all duration-200"
                          )}
                        >
                          {teamTimeslot.teams.name}
                        </Link>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">Unknown Team</span>
                      )}
                    </div>
                  </div>
                  
                  {teamTimeslot.teams?.divisionName && (
                    <Badge 
                      variant={getDivisionBadgeVariant(teamTimeslot.teams.divisionName)}
                      className="ml-2 text-xs font-medium px-2.5 py-0.5"
                    >
                      {teamTimeslot.teams.divisionName}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Helper function to determine badge variant based on division
function getDivisionBadgeVariant(divisionName: string): "competitive" | "intermediate" | "recreational" | "outline" {
  if (!divisionName) return "outline";
  
  const lowerDivName = divisionName.toLowerCase();
  if (lowerDivName.includes('competitive')) return "competitive";
  if (lowerDivName.includes('intermediate')) return "intermediate";
  if (lowerDivName.includes('recreational')) return "recreational";
  
  return "outline";
}

export default TimeslotGrouping;
