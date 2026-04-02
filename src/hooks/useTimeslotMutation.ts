import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useState } from 'react';

import { useToast } from '@/hooks/useToast';
import { ByeWeekService } from '@/services/timeslots/ByeWeekService';
import { TimeslotService } from '@/services/timeslots/TimeslotService';
import { TimeslotValidator } from '@/services/timeslots/TimeslotValidator';
import { TeamTimeslot } from '@/types/timeslots';

export const useTimeslotMutation = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Add a new timeslot assignment
  const addTimeslot = async (
    date: Date,
    teamId: string,
    timeslot: string
  ): Promise<TeamTimeslot | null> => {
    // Validate input data
    const validation = TimeslotValidator.validateTimeslotAssignment(date, teamId, timeslot);
    if (!validation.valid) {
      toast({
        title: 'Validation Error',
        description: validation.error,
        variant: 'destructive',
      });
      return null;
    }

    setIsSubmitting(true);
    try {
      const data = await TimeslotService.addTimeslot(date, teamId, timeslot);

      // Invalidate timeslot queries to refresh UI
      const formattedDate = format(date, 'yyyy-MM-dd');
      queryClient.invalidateQueries({ queryKey: ['timeslots', formattedDate] });
      queryClient.invalidateQueries({ queryKey: ['match-timeslots', formattedDate] });

      return data[0] ?? null;
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to assign timeslot',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete a timeslot assignment
  const deleteTimeslot = async (id: string): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      await TimeslotService.deleteTimeslot(id);

      // Invalidate all timeslot queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['timeslots'] });
      queryClient.invalidateQueries({ queryKey: ['match-timeslots'] });

      return true;
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to remove timeslot',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Batch assign multiple teams to the same timeslot
  const batchAssignTimeslots = async (
    date: Date,
    teamIds: string[],
    timeslot: string
  ): Promise<TeamTimeslot[] | null> => {
    // Validate input data
    const validation = TimeslotValidator.validateBatchAssignment(date, teamIds, timeslot);
    if (!validation.valid) {
      toast({
        title: 'Validation Error',
        description: validation.error,
        variant: 'destructive',
      });
      return null;
    }

    setIsSubmitting(true);
    try {
      const data = await TimeslotService.batchAssignTimeslots(date, teamIds, timeslot);

      // Invalidate timeslot queries to refresh UI
      const formattedDate = format(date, 'yyyy-MM-dd');
      queryClient.invalidateQueries({ queryKey: ['timeslots', formattedDate] });
      queryClient.invalidateQueries({ queryKey: ['match-timeslots', formattedDate] });

      return data;
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to batch assign timeslots',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Batch assign double headers to multiple teams (two separate timeslot blocks)
  const batchAssignDoubleHeaders = async (
    date: Date,
    teamIds: string[],
    slot1: string,
    slot2: string
  ): Promise<TeamTimeslot[] | null> => {
    // Basic validation
    if (!teamIds.length) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one team',
        variant: 'destructive',
      });
      return null;
    }

    if (!slot1 || !slot2) {
      toast({
        title: 'Validation Error',
        description: 'Please select two timeslots for double header',
        variant: 'destructive',
      });
      return null;
    }

    if (slot1 === slot2) {
      toast({
        title: 'Validation Error',
        description: 'Please select two different timeslots for double header',
        variant: 'destructive',
      });
      return null;
    }

    setIsSubmitting(true);
    try {
      const data = await TimeslotService.batchAssignDoubleHeaders(date, teamIds, slot1, slot2);

      // Invalidate timeslot queries to refresh UI
      const formattedDate = format(date, 'yyyy-MM-dd');
      queryClient.invalidateQueries({ queryKey: ['timeslots', formattedDate] });
      queryClient.invalidateQueries({ queryKey: ['match-timeslots', formattedDate] });

      return data;
    } catch (err) {
      toast({
        title: 'Error',
        description:
          err instanceof Error ? err.message : 'Failed to batch assign double header timeslots',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const assignByeWeek = async (date: Date, teamId: string): Promise<TeamTimeslot | null> => {
    setIsSubmitting(true);
    try {
      const data = await ByeWeekService.assignByeWeek(date, teamId);
      const formattedDate = format(date, 'yyyy-MM-dd');
      queryClient.invalidateQueries({ queryKey: ['timeslots', formattedDate] });
      queryClient.invalidateQueries({ queryKey: ['match-timeslots', formattedDate] });
      return data;
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to assign bye week',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const batchAssignByeWeeks = async (date: Date, teamIds: string[]): Promise<TeamTimeslot[] | null> => {
    setIsSubmitting(true);
    try {
      const data = await ByeWeekService.batchAssignByeWeeks(date, teamIds);
      const formattedDate = format(date, 'yyyy-MM-dd');
      queryClient.invalidateQueries({ queryKey: ['timeslots', formattedDate] });
      queryClient.invalidateQueries({ queryKey: ['match-timeslots', formattedDate] });
      return data;
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to batch assign bye weeks',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeByeWeek = async (timeslotId: string): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      await ByeWeekService.removeByeWeek(timeslotId);
      queryClient.invalidateQueries({ queryKey: ['timeslots'] });
      queryClient.invalidateQueries({ queryKey: ['match-timeslots'] });
      return true;
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to remove bye week',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    addTimeslot,
    deleteTimeslot,
    batchAssignTimeslots,
    batchAssignDoubleHeaders,
    assignByeWeek,
    batchAssignByeWeeks,
    removeByeWeek,
  };
};
