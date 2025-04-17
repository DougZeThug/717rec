
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
                // Enhanced debugging to verify what's coming from the API
                console.log('Team data in TimeslotGrouping:', {
                  teamId: teamTimeslot.team_id,
                  teamName: teamTimeslot.teams?.name,
                  logoUrl: teamTimeslot.teams?.logo_url,
                  rawTeams: teamTimeslot.teams
                });
                
                // Check if we need to construct a full URL from a relative path
                let logoUrl = teamTimeslot.teams?.logo_url;
                
                // If logoUrl exists and starts with a slash, it might be a relative path
                if (logoUrl && logoUrl.startsWith('/')) {
                  console.log('Detected relative path for logo:', logoUrl);
                  // No need to construct URL as the logo_url should be a full URL from Supabase Storage
                }
                
                return (
                  <div 
                    key={teamTimeslot.id} 
                    className="flex items-center p-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Avatar className="h-8 w-8 mr-3">
                      {logoUrl ? (
                        <AvatarImage 
                          src={logoUrl}
                          alt={`${teamTimeslot.teams?.name || 'Team'} logo`}
                        />
                      ) : (
                        <AvatarFallback>
                          <Users className="h-4 w-4 text-gray-500" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    
                    {teamTimeslot.teams?.name ? (
                      <Link 
                        to={`/teams/${teamTimeslot.team_id}`}
                        className="text-cornhole-navy hover:underline"
                      >
                        {teamTimeslot.teams.name}
                      </Link>
                    ) : (
                      <span className="text-gray-500">Unknown Team</span>
                    )}
                    
                    {/* Add team division as a badge if available */}
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
