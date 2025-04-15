
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TeamTimeslot } from "@/types";

interface TeamTimeslotDisplayProps {
  teamId: string;
  teamName: string;
  date?: Date;
}

const TeamTimeslotDisplay: React.FC<TeamTimeslotDisplayProps> = ({ 
  teamId, 
  teamName, 
  date = new Date() 
}) => {
  const [timeslot, setTimeslot] = useState<TeamTimeslot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTimeslot = async () => {
      setIsLoading(true);
      
      try {
        // Format date for database query
        const formattedDate = format(date, 'yyyy-MM-dd');
        
        const { data, error } = await supabase
          .from('team_timeslots')
          .select('*')
          .eq('team_id', teamId)
          .eq('match_date', formattedDate)
          .maybeSingle();
        
        if (error) {
          throw error;
        }
        
        setTimeslot(data);
      } catch (error: any) {
        console.error('Error fetching team timeslot:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTimeslot();
  }, [teamId, date]);

  if (isLoading) {
    return (
      <Card className="bg-gray-50">
        <CardContent className="pt-6 pb-4 text-center">
          <p className="text-gray-500">Loading timeslot information...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={timeslot ? "bg-blue-50" : "bg-gray-50"}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Today's Timeslot</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {timeslot ? (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <p className="font-medium">{timeslot.timeslot}</p>
          </div>
        ) : (
          <p className="text-gray-500">No timeslot assigned for today</p>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamTimeslotDisplay;
