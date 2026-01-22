import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useState } from 'react';

import { useToast } from '@/hooks/use-toast';
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
      const result = await TimeslotService.addTimeslot(date, teamId, timeslot);

      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to assign timeslot',
          variant: 'destructive',
        });
        return null;
      }

      // Invalidate timeslot queries to refresh UI
      const formattedDate = format(date, 'yyyy-MM-dd');
      queryClient.invalidateQueries({ queryKey: ['timeslots', formattedDate] });
      queryClient.invalidateQueries({ queryKey: ['match-timeslots', formattedDate] });

      return result.data as TeamTimeslot;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete a timeslot assignment
  const deleteTimeslot = async (id: string): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const result = await TimeslotService.deleteTimeslot(id);

      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to remove timeslot',
          variant: 'destructive',
        });
        return false;
      }

      // Invalidate all timeslot queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['timeslots'] });
      queryClient.invalidateQueries({ queryKey: ['match-timeslots'] });

      return true;
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
      const result = await TimeslotService.batchAssignTimeslots(date, teamIds, timeslot);

      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to batch assign timeslots',
          variant: 'destructive',
        });
        return null;
      }

      // Invalidate timeslot queries to refresh UI
      const formattedDate = format(date, 'yyyy-MM-dd');
      queryClient.invalidateQueries({ queryKey: ['timeslots', formattedDate] });
      queryClient.invalidateQueries({ queryKey: ['match-timeslots', formattedDate] });

      return result.data as TeamTimeslot[];
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
      const result = await TimeslotService.batchAssignDoubleHeaders(date, teamIds, slot1, slot2);

      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to batch assign double header timeslots',
          variant: 'destructive',
        });
        return null;
      }

      // Invalidate timeslot queries to refresh UI
      const formattedDate = format(date, 'yyyy-MM-dd');
      queryClient.invalidateQueries({ queryKey: ['timeslots', formattedDate] });
      queryClient.invalidateQueries({ queryKey: ['match-timeslots', formattedDate] });

      return result.data as TeamTimeslot[];
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
  };
};
