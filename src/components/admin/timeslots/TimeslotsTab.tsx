import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import React, { useState } from 'react';

import TimeslotAssignment from '@/components/timeslots/TimeslotAssignment';
import TimeslotList from '@/components/timeslots/TimeslotList';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTeamsQuery } from '@/hooks/teams';
import { useTimeslots } from '@/hooks/useTimeslots';
import { useToast } from '@/hooks/useToast';
import { errorLog } from '@/utils/logger';

const TimeslotsTab = () => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: teams = [], isLoading: isLoadingTeams } = useTeamsQuery();

  const {
    timeslots,
    isLoading: isLoadingTimeslots,
    addTimeslot,
    deleteTimeslot,
    batchAssignTimeslots,
    batchAssignDoubleHeaders,
    assignByeWeek,
    batchAssignByeWeeks,
    removeByeWeek,
  } = useTimeslots(selectedDate);

  const handleTimeslotAssign = async (teamId: string, timeslot: string) => {
    try {
      if (timeslot === 'BYE') {
        // Handle bye week assignment separately
        await assignByeWeek(selectedDate, teamId);
        toast({
          title: 'Bye Week Assigned',
          description: 'Team bye week has been successfully assigned.',
        });
      } else {
        // Use existing timeslot service for regular timeslots
        await addTimeslot(selectedDate, teamId, timeslot);
        toast({
          title: 'Timeslot Assigned',
          description: 'Team timeslot has been successfully assigned.',
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

  const handleBatchTimeslotAssign = async (teamIds: string[], timeslot: string) => {
    try {
      if (timeslot === 'BYE') {
        // Handle bye week batch assignment separately
        await batchAssignByeWeeks(selectedDate, teamIds);
        toast({
          title: 'Bye Weeks Assigned',
          description: `${teamIds.length} team bye weeks have been set for ${format(selectedDate, 'MMMM d, yyyy')}`,
        });
      } else {
        // Use existing batch assignment function for regular timeslots
        await batchAssignTimeslots(selectedDate, teamIds, timeslot);
        toast({
          title: 'Timeslots Assigned',
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

  const handleBatchDoubleHeaderAssign = async (teamIds: string[], slot1: string, slot2: string) => {
    try {
      await batchAssignDoubleHeaders(selectedDate, teamIds, slot1, slot2);
      toast({
        title: 'Double Headers Assigned',
        description: `${teamIds.length} team double headers (${slot1} & ${slot2}) have been set for ${format(selectedDate, 'MMMM d, yyyy')}`,
      });
    } catch (error) {
      errorLog('Error during double header assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign double header timeslots. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleTimeslotDelete = async (id: string) => {
    try {
      // Check if this is a bye week by looking at the timeslot data
      const timeslotToDelete = timeslots.find((ts) => ts.id === id);

      if (timeslotToDelete?.timeslot === 'BYE') {
        // Handle bye week deletion separately
        await removeByeWeek(id);
        toast({
          title: 'Bye Week Removed',
          description: 'Bye week assignment has been removed.',
        });
      } else {
        // Use existing deletion service for regular timeslots
        await deleteTimeslot(id);
        toast({
          title: 'Timeslot Removed',
          description: 'Timeslot assignment has been removed.',
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
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle>Assign Timeslots</CardTitle>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] pl-3 text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, 'PPP')}
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
                onBatchAssignDoubleHeaders={handleBatchDoubleHeaderAssign}
              />
            )}
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Current Timeslots</h3>
            {isLoadingTimeslots ? (
              <p>Loading timeslots...</p>
            ) : (
              <div className="bg-card p-4 rounded-md border border-border">
                <TimeslotList timeslots={timeslots} teams={teams} onDelete={handleTimeslotDelete} />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeslotsTab;
