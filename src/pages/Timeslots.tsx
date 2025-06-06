
import React, { useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import TimeslotAssignment from "@/components/timeslots/TimeslotAssignment";
import TimeslotList from "@/components/timeslots/TimeslotList";
import { useTimeslots } from "@/hooks/useTimeslots";
import { useTeamData } from "@/hooks/useTeamData";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Navigate } from "react-router-dom";

export default function Timeslots() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { data: teams, isLoading: isLoadingTeams } = useTeamData();
  const { timeslots, isLoading, addTimeslot, deleteTimeslot, batchAssignTimeslots } = useTimeslots(selectedDate);
  const { toast } = useToast();
  const { isAdminAccessGranted, isLoading: isAdminLoading } = useAdminAccess();
  
  // Show loading while checking admin access
  if (isAdminLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }
  
  // Redirect non-admin users
  if (!isAdminAccessGranted) {
    return <Navigate to="/" replace />;
  }
  
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleBatchAssign = async (teamIds: string[], timeslot: string) => {
    try {
      // Use the new batch assignment function instead of individual calls
      await batchAssignTimeslots(selectedDate, teamIds, timeslot);
      
      toast({
        title: "Timeslots assigned",
        description: `${teamIds.length} team timeslots have been set for ${format(selectedDate, 'MMMM d, yyyy')}`,
      });
    } catch (error) {
      console.error("Error during batch assignment:", error);
      // The toast notification is already shown in the hook
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
