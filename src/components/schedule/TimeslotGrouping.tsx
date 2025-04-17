
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TeamTimeslot } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
        <p>Loading timeslots...</p>
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
      {Object.entries(groupedTimeslots).map(([timeslot, teams]) => (
        <Card key={timeslot} className="overflow-hidden">
          <div className="bg-cornhole-navy text-white px-4 py-2 font-medium">
            {timeslot}
          </div>
          <CardContent className="py-4">
            <div className="space-y-2">
              {teams.map(teamTimeslot => {
                // Add console log to debug team data
                console.log('Team timeslot data:', teamTimeslot.teams);
                
                // Safe access with nullish coalescing
                const logoSrc = teamTimeslot.teams?.logo_url ?? '';
                const teamName = teamTimeslot.teams?.name || 'Unknown Team';
                
                return (
                  <div 
                    key={teamTimeslot.id} 
                    className="flex items-center p-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Avatar className="h-8 w-8 mr-3">
                      {logoSrc ? (
                        <AvatarImage 
                          src={logoSrc}
                          alt={`${teamName} logo`}
                        />
                      ) : (
                        <AvatarFallback>
                          <Users className="h-4 w-4 text-gray-500" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    
                    <div className="flex flex-col">
                      {teamTimeslot.teams?.id ? (
                        <Link 
                          to={`/teams/${teamTimeslot.team_id}`}
                          className="text-cornhole-navy hover:underline"
                        >
                          {teamName}
                        </Link>
                      ) : (
                        <span className="text-gray-500">Unknown Team</span>
                      )}
                    </div>
                    
                    {teamTimeslot.teams?.divisionName && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {teamTimeslot.teams.divisionName}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TimeslotGrouping;
