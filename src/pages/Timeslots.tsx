import { format } from 'date-fns';
import React, { useState } from 'react';
import { Navigate } from 'react-router';

import TimeslotAssignment from '@/components/timeslots/TimeslotAssignment';
import TimeslotList from '@/components/timeslots/TimeslotList';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';
import { useTeamsQuery } from '@/hooks/teams';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useTimeslots } from '@/hooks/useTimeslots';
import { useToast } from '@/hooks/useToast';
import { ByeWeekService } from '@/services/timeslots/ByeWeekService';
import { errorLog } from '@/utils/logger';

export default function Timeslots() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { data: teams, isLoading: isLoadingTeams } = useTeamsQuery();
  const {
    timeslots,
    isLoading,
    addTimeslot,
    deleteTimeslot,
    batchAssignTimeslots,
    refreshTimeslots,
  } = useTimeslots(selectedDate);
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

  const handleAssign = async (teamId: string, timeslot: string) => {
    try {
      if (timeslot === 'BYE') {
        await ByeWeekService.assignByeWeek(selectedDate, teamId);
        refreshTimeslots(); // Refresh the data
        toast({
          title: 'Bye week assigned',
          description: `Team bye week has been set for ${format(selectedDate, 'MMMM d, yyyy')}`,
        });
      } else {
        await addTimeslot(selectedDate, teamId, timeslot);
        toast({
          title: 'Timeslot assigned',
          description: `Team timeslot has been set for ${format(selectedDate, 'MMMM d, yyyy')}`,
        });
      }
    } catch (error) {
      errorLog('Error assigning timeslot:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign timeslot. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleBatchAssign = async (teamIds: string[], timeslot: string) => {
    try {
      if (timeslot === 'BYE') {
        await ByeWeekService.batchAssignByeWeeks(selectedDate, teamIds);
        refreshTimeslots(); // Refresh the data
        toast({
          title: 'Bye weeks assigned',
          description: `${teamIds.length} team bye weeks have been set for ${format(selectedDate, 'MMMM d, yyyy')}`,
        });
      } else {
        await batchAssignTimeslots(selectedDate, teamIds, timeslot);
        toast({
          title: 'Timeslots assigned',
          description: `${teamIds.length} team timeslots have been set for ${format(selectedDate, 'MMMM d, yyyy')}`,
        });
      }
    } catch (error) {
      errorLog('Error during batch assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign timeslots. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Check if this is a bye week
      const timeslotToDelete = timeslots.find((ts) => ts.id === id);

      if (timeslotToDelete?.timeslot === 'BYE') {
        await ByeWeekService.removeByeWeek(id);
        refreshTimeslots(); // Refresh the data
        toast({
          title: 'Bye week removed',
          description: 'The bye week assignment has been removed',
        });
      } else {
        await deleteTimeslot(id);
        toast({
          title: 'Timeslot removed',
          description: 'The timeslot assignment has been removed',
        });
      }
    } catch (error) {
      errorLog('Error removing timeslot:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove timeslot. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-4 px-3 md:py-8 md:px-4">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Weekly Timeslot Assignments</h1>

      {/* Mobile: stacked vertical layout without card wrappers */}
      <div className="block md:hidden space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Select Date</h2>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="rounded-md border"
          />
          <p className="text-sm font-medium text-center mt-2">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Assign Timeslot</h2>
          {isLoadingTeams ? (
            <LoadingState variant="section" message="Loading teams..." />
          ) : (
            <TimeslotAssignment
              selectedDate={selectedDate}
              teams={teams || []}
              existingTimeslots={timeslots}
              onAssign={handleAssign}
              onBatchAssign={handleBatchAssign}
            />
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Timeslots for {format(selectedDate, 'MMMM d, yyyy')}
          </h2>
          {isLoading ? (
            <LoadingState variant="section" message="Loading timeslots..." />
          ) : (
            <TimeslotList timeslots={timeslots} teams={teams || []} onDelete={handleDelete} />
          )}
        </div>
      </div>

      {/* Desktop: original grid layout with cards */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-3 gap-8">
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
              <p className="text-lg font-medium">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
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
                <LoadingState variant="section" message="Loading teams..." />
              ) : (
                <TimeslotAssignment
                  selectedDate={selectedDate}
                  teams={teams || []}
                  existingTimeslots={timeslots}
                  onAssign={handleAssign}
                  onBatchAssign={handleBatchAssign}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeslots for {format(selectedDate, 'MMMM d, yyyy')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <LoadingState variant="section" message="Loading timeslots..." />
              ) : (
                <TimeslotList timeslots={timeslots} teams={teams || []} onDelete={handleDelete} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
