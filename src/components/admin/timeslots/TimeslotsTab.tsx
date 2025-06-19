
import React, { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TimeslotAssignment from "@/components/timeslots/TimeslotAssignment";
import TimeslotList from "@/components/timeslots/TimeslotList";
import { useTimeslots } from "@/hooks/useTimeslots";
import { useTeamData } from "@/hooks/useTeamData";
import { useToast } from "@/hooks/use-toast";
import { Team } from "@/types";

const TimeslotsTab = () => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const teamQuery = useTeamData();
  const teams = teamQuery.data || [];
  const isLoadingTeams = teamQuery.isLoading;
  
  const { 
    timeslots, 
    isLoading: isLoadingTimeslots, 
    deleteTimeslot,
    batchAssignTimeslots
  } = useTimeslots(selectedDate);

  const handleBatchTimeslotAssign = async (teamIds: string[], timeslot: string) => {
    try {
      console.log("Starting batch assignment for teams:", teamIds, "with timeslot:", timeslot);
      
      // Use the batch assignment function
      await batchAssignTimeslots(selectedDate, teamIds, timeslot);
      
      toast({
        title: "Timeslots Assigned",
        description: `${teamIds.length} team timeslots have been set for ${format(selectedDate, 'MMMM d, yyyy')}`,
      });
    } catch (error) {
      console.error("Error during batch assignment:", error);
      // Toast notification is handled in the hook
    }
  };

  const handleTimeslotDelete = async (id: string) => {
    try {
      await deleteTimeslot(id);
      toast({
        title: "Timeslot Removed",
        description: "Timeslot assignment has been removed.",
      });
    } catch (error) {
      console.error("Error removing timeslot:", error);
      // Toast notification is handled in the hook
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle>Assign Timeslots</CardTitle>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] pl-3 text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-medium mb-4">Assign Timeslots</h3>
            {isLoadingTeams ? (
              <p>Loading teams...</p>
            ) : (
              <TimeslotAssignment 
                selectedDate={selectedDate}
                teams={teams}
                existingTimeslots={timeslots}
                onBatchAssign={handleBatchTimeslotAssign}
              />
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Current Timeslots</h3>
            {isLoadingTimeslots ? (
              <p>Loading timeslots...</p>
            ) : (
              <div className="bg-slate-50 p-4 rounded-md border">
                <TimeslotList 
                  timeslots={timeslots} 
                  teams={teams}
                  onDelete={handleTimeslotDelete}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeslotsTab;
