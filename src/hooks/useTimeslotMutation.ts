import { format } from 'date-fns';
import { useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import { TimeslotService } from '@/services/timeslots/TimeslotService';
import { TimeslotValidator } from '@/services/timeslots/TimeslotValidator';
import { TeamTimeslot } from '@/types/timeslots';

export const useTimeslotMutation = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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
  };
};
