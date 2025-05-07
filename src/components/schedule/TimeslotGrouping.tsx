
import React, { useState } from "react";
import { TeamTimeslot } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { animations, getDivisionStyles } from "@/styles/design-system";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TeamLogo } from "@/components/ui/team";
import { AppCard } from "@/components/ui/app-card";
import LoadingState from "@/components/ui/loading-state";

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
    return <LoadingState message="Loading timeslots..." />;
  }
  
  if (Object.keys(groupedTimeslots).length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-gray-500 dark:text-gray-400">No timeslots scheduled for this date.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {Object.entries(groupedTimeslots).map(([timeslot, teams], index) => (
        <AppCard 
          key={timeslot} 
          className={cn(
            "overflow-hidden border-gray-200 dark:border-gray-700 transition-all duration-300 p-0",
            animations.entranceLeft,
            `animation-delay-${index * 100}`
          )}
          elevation="default"
          isInteractive={false}
        >
          <Collapsible 
            open={expandedTimeslots[timeslot]} 
            onOpenChange={() => toggleTimeslot(timeslot)}
            className="w-full"
          >
            <CollapsibleTrigger className="w-full">
              <div className={cn(
                "bg-cornhole-navy text-white px-4 py-3 font-medium",
                "bg-gradient-to-r from-cornhole-navy to-cornhole-navy/90",
                "flex justify-between items-center cursor-pointer min-h-[48px]"
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
              <div className="p-4">
                <div className="space-y-1">
                  {teams.map((teamTimeslot, teamIndex) => (
                    <div 
                      key={teamTimeslot.id} 
                      className={cn(
                        "flex items-center justify-between p-3 rounded-md",
                        "hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150",
                        animations.fadeInSlideUp,
                        `animation-delay-${teamIndex * 100 + 100}`,
                        "touch-manipulation" // Improves touch experience on mobile
                      )}
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        <TeamLogo 
                          imageUrl={teamTimeslot.teams?.logo_url || teamTimeslot.teams?.image_url}
                          teamName={teamTimeslot.teams?.name || "Unknown Team"}
                          teamId={teamTimeslot.team_id}
                          size="sm"
                          clickable={true}
                          className="mr-3 shrink-0"
                        />
                        
                        <div className="flex flex-col min-w-0">
                          {teamTimeslot.teams?.name ? (
                            <Link 
                              to={`/teams/${teamTimeslot.team_id}`}
                              className={cn(
                                "font-medium text-cornhole-navy dark:text-white truncate",
                                "hover:underline transition-all duration-200"
                              )}
                            >
                              {teamTimeslot.teams.name}
                            </Link>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400 truncate">Unknown Team</span>
                          )}
                        </div>
                      </div>
                      
                      {teamTimeslot.teams?.divisionName && (
                        <Badge 
                          className={cn(
                            "ml-2 text-xs font-medium px-2.5 py-0.5 shrink-0",
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
              </div>
            </CollapsibleContent>
          </Collapsible>
        </AppCard>
      ))}
    </div>
  );
};

export default TimeslotGrouping;
