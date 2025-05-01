
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TeamTimeslot } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { gradients, interactive, animations, getDivisionStyles } from "@/styles/designSystem";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TeamLogo } from "@/components/ui/team";

interface TimeslotGroupingProps {
  groupedTimeslots: Record<string, TeamTimeslot[]>;
  isLoading: boolean;
}

const TimeslotGrouping: React.FC<TimeslotGroupingProps> = ({ 
  groupedTimeslots, 
  isLoading 
}) => {
  // Track which timeslots are expanded
  const [expandedTimeslots, setExpandedTimeslots] = useState<Record<string, boolean>>(() => {
    // Initialize all timeslots as expanded
    const initialState: Record<string, boolean> = {};
    Object.keys(groupedTimeslots).forEach(timeslot => {
      initialState[timeslot] = true;
    });
    return initialState;
  });

  const toggleTimeslot = (timeslot: string) => {
    setExpandedTimeslots(prev => ({
      ...prev,
      [timeslot]: !prev[timeslot]
    }));
  };

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
          <Collapsible 
            open={expandedTimeslots[timeslot]} 
            onOpenChange={() => toggleTimeslot(timeslot)}
          >
            <CollapsibleTrigger className="w-full">
              <div className={cn(
                "bg-cornhole-navy text-white px-4 py-3 font-medium",
                "bg-gradient-to-r from-cornhole-navy to-cornhole-navy/90",
                "flex justify-between items-center cursor-pointer"
              )}>
                <div className="flex items-center gap-2">
                  {timeslot}
                  <Badge variant="outline" className="bg-white/10 text-white ml-2">
                    {teams.length} {teams.length === 1 ? 'team' : 'teams'}
                  </Badge>
                </div>
                {expandedTimeslots[timeslot] ? 
                  <ChevronDown className="h-4 w-4 text-white/80" /> : 
                  <ChevronRight className="h-4 w-4 text-white/80" />
                }
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
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
                        <TeamLogo 
                          imageUrl={teamTimeslot.teams?.image_url || teamTimeslot.teams?.logo_url}
                          teamName={teamTimeslot.teams?.name || "Unknown Team"}
                          teamId={teamTimeslot.team_id}
                          size="sm"
                          clickable={true}
                          className="mr-3"
                        />
                        
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
                          className={cn(
                            "ml-2 text-xs font-medium px-2.5 py-0.5",
                            getDivisionStyles(teamTimeslot.teams.divisionName, 'bg'),
                            getDivisionStyles(teamTimeslot.teams.divisionName, 'text')
                          )}
                        >
                          {teamTimeslot.teams.divisionName}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
};

export default TimeslotGrouping;
