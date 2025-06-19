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
import { ByeWeekService } from "@/services/timeslots/ByeWeekService";
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
    addTimeslot, 
    deleteTimeslot,
    batchAssignTimeslots
  } = useTimeslots(selectedDate);

  const handleTimeslotAssign = async (teamId: string, timeslot: string) => {
    try {
      if (timeslot === 'BYE') {
        // Handle bye week assignment separately
        await ByeWeekService.assignByeWeek(selectedDate, teamId);
        toast({
          title: "Bye Week Assigned",
          description: "Team bye week has been successfully assigned.",
        });
      } else {
        // Use existing timeslot service for regular timeslots
        await addTimeslot(selectedDate, teamId, timeslot);
        toast({
          title: "Timeslot Assigned",
          description: "Team timeslot has been successfully assigned.",
        });
      }
    } catch (error) {
      console.error("Error assigning timeslot:", error);
      toast({
        title: "Error",
        description: "Failed to assign timeslot. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBatchTimeslotAssign = async (teamIds: string[], timeslot: string) => {
    try {
      console.log("Starting batch assignment for teams:", teamIds, "with timeslot:", timeslot);
      
      if (timeslot === 'BYE') {
        // Handle bye week batch assignment separately
        await ByeWeekService.batchAssignByeWeeks(selectedDate, teamIds);
        toast({
          title: "Bye Weeks Assigned",
          description: `${teamIds.length} team bye weeks have been set for ${format(selectedDate, 'MMMM d, yyyy')}`,
        });
      } else {
        // Use existing batch assignment function for regular timeslots
        await batchAssignTimeslots(selectedDate, teamIds, timeslot);
        toast({
          title: "Timeslots Assigned",
          description: `${teamIds.length} team timeslots have been set for ${format(selectedDate, 'MMMM d, yyyy')}`,
        });
      }
    } catch (error) {
      console.error("Error during batch assignment:", error);
      toast({
        title: "Error",
        description: "Failed to assign timeslots. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTimeslotDelete = async (id: string) => {
    try {
      // Check if this is a bye week by looking at the timeslot data
      const timeslotToDelete = timeslots.find(ts => ts.id === id);
      
      if (timeslotToDelete?.timeslot === 'BYE') {
        // Handle bye week deletion separately
        await ByeWeekService.removeByeWeek(id);
        toast({
          title: "Bye Week Removed",
          description: "Bye week assignment has been removed.",
        });
      } else {
        // Use existing deletion service for regular timeslots
        await deleteTimeslot(id);
        toast({
          title: "Timeslot Removed",
          description: "Timeslot assignment has been removed.",
        });
      }
    } catch (error) {
      console.error("Error removing timeslot:", error);
      toast({
        title: "Error",
        description: "Failed to remove timeslot. Please try again.",
        variant: "destructive",
      });
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
            <h3 className="text-lg font-medium mb-4">Assign a New Timeslot</h3>
            {isLoadingTeams ? (
              <p>Loading teams...</p>
            ) : (
              <TimeslotAssignment 
                selectedDate={selectedDate}
                teams={teams}
                existingTimeslots={timeslots}
                onAssign={handleTimeslotAssign}
                onBatchAssign={handleBatchTimeslotAssign}
              />
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Current Timeslots</h3>
            {isLoadingTimeslots ? (
              <p>Loading timeslots...</p>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md border">
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
