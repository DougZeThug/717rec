
import React, { useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import TimeslotAssignment from "@/components/timeslots/TimeslotAssignment";
import TimeslotList from "@/components/timeslots/TimeslotList";
import { useTimeslots } from "@/hooks/useTimeslots";
import { useTeamData } from "@/hooks/useTeamData";

export default function Timeslots() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { data: teams, isLoading: isLoadingTeams } = useTeamData();
  const { timeslots, isLoading, addTimeslot, deleteTimeslot } = useTimeslots(selectedDate);
  const { toast } = useToast();
  
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleBatchAssign = async (teamIds: string[], timeslot: string) => {
    try {
      // Create a promise for each team assignment
      const assignmentPromises = teamIds.map(teamId => 
        addTimeslot(selectedDate, teamId, timeslot)
      );
      
      // Wait for all assignments to complete
      await Promise.all(assignmentPromises);
      
      toast({
        title: "Timeslots assigned",
        description: `${teamIds.length} team timeslots have been set for ${format(selectedDate, 'MMMM d, yyyy')}`,
      });
    } catch (error) {
      console.error("Error during batch assignment:", error);
      toast({
        title: "Error",
        description: "Some timeslots could not be assigned. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Weekly Timeslot Assignments</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              className="rounded-md border"
            />
            <div className="mt-4 text-center">
              <p className="text-lg font-medium">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Assign Timeslot</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTeams ? (
                <div className="text-center py-4">Loading teams...</div>
              ) : (
                <TimeslotAssignment 
                  selectedDate={selectedDate}
                  teams={teams || []}
                  existingTimeslots={timeslots}
                  onAssign={(teamId, timeslot) => {
                    addTimeslot(selectedDate, teamId, timeslot);
                    toast({
                      title: "Timeslot assigned",
                      description: `Team timeslot has been set for ${format(selectedDate, 'MMMM d, yyyy')}`,
                    });
                  }}
                  onBatchAssign={handleBatchAssign}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeslots for {format(selectedDate, "MMMM d, yyyy")}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Loading timeslots...</div>
              ) : (
                <TimeslotList 
                  timeslots={timeslots}
                  teams={teams || []}
                  onDelete={(id) => {
                    deleteTimeslot(id);
                    toast({
                      title: "Timeslot removed",
                      description: "The timeslot assignment has been removed",
                    });
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
