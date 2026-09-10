import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useState } from 'react';

import { useToast } from '@/hooks/useToast';
import { ByeWeekService } from '@/services/timeslots/ByeWeekService';
import { TimeslotService } from '@/services/timeslots/TimeslotService';
import { TimeslotValidator } from '@/services/timeslots/TimeslotValidator';
import { TeamTimeslot } from '@/types/timeslots';
import { getBackToBackPairName } from '@/utils/autoSchedule/constants';
import { getUIErrorMessage } from '@/utils/errorHandler';

/**
 * How a move ended.
 *
 * A move is two writes and there is no transaction, so "it worked" is not the
 * only good answer. `booked-not-cleared` is the one that needs saying out loud:
 * the team now holds the new block *and* the old one, which is visible in the
 * night's list and repaired by removing a row.
 */
export type TimeslotMoveOutcome = 'moved' | 'booked-not-cleared' | 'refused';

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
        description: getUIErrorMessage(err, 'Failed to assign timeslot'),
        variant: 'destructive',
      });
      throw err;
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
        description: getUIErrorMessage(err, 'Failed to remove timeslot'),
        variant: 'destructive',
      });
      throw err;
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
        description: getUIErrorMessage(err, 'Failed to batch assign timeslots'),
        variant: 'destructive',
      });
      throw err;
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
    // Shared validation (past-date, empty teams, empty slot) — keep parity
    // with batchAssignTimeslots so the UI form behaves the same regardless of
    // the "Double Header" toggle.
    const validation = TimeslotValidator.validateBatchAssignment(date, teamIds, slot1);
    if (!validation.valid) {
      toast({
        title: 'Validation Error',
        description: validation.error,
        variant: 'destructive',
      });
      return null;
    }

    if (!slot2) {
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
        description: getUIErrorMessage(err, 'Failed to batch assign double header timeslots'),
        variant: 'destructive',
      });
      throw err;
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
        description: getUIErrorMessage(err, 'Failed to assign bye week'),
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const batchAssignByeWeeks = async (
    date: Date,
    teamIds: string[]
  ): Promise<TeamTimeslot[] | null> => {
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
        description: getUIErrorMessage(err, 'Failed to batch assign bye weeks'),
        variant: 'destructive',
      });
      throw err;
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
        description: getUIErrorMessage(err, 'Failed to remove bye week'),
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Move one team's booking on one night: book the new block, then clear the
   * rows the caller read before that.
   *
   * **Book first, clear second, and clear by id.** `team_timeslots` has no
   * update path, so every move is two writes. Clearing first would leave the
   * team with nothing at all if the booking then failed — a hole nobody sees
   * until league night. Booking first means the worst case is the team booked
   * twice, which sits in the night's list where an admin reads it. Clearing by
   * id rather than by rule is what makes that order possible: the rule-based
   * delete in `TimeslotService.deleteTimeslot` would take the new rows too.
   */
  const moveTeamBooking = async (
    date: Date,
    teamId: string,
    /** The block's first time, or 'BYE'. */
    slot: string,
    /** Rows to clear afterwards, read before the booking is written. */
    removeIds: string[]
  ): Promise<TimeslotMoveOutcome> => {
    const isBye = slot === 'BYE';

    // Byes skip the past-date check everywhere else in this file, so they skip
    // it here too rather than disagreeing with the screen they came from.
    if (!isBye) {
      const validation = TimeslotValidator.validateTimeslotAssignment(date, teamId, slot);
      if (!validation.valid) {
        toast({
          title: 'Validation Error',
          description: validation.error,
          variant: 'destructive',
        });
        return 'refused';
      }
    }

    const pairName = isBye ? null : getBackToBackPairName(slot);
    if (!isBye && !pairName) {
      toast({
        title: 'Validation Error',
        description: `${slot} does not start a block, so it cannot be booked.`,
        variant: 'destructive',
      });
      return 'refused';
    }

    const formattedDate = format(date, 'yyyy-MM-dd');
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['timeslots', formattedDate] });
      queryClient.invalidateQueries({ queryKey: ['match-timeslots', formattedDate] });
    };

    setIsSubmitting(true);
    try {
      if (isBye) {
        await ByeWeekService.assignByeWeek(date, teamId);
      } else {
        await TimeslotService.batchAssignBackToBackTimeslots(date, [teamId], pairName as string);
      }
      refresh();

      try {
        await TimeslotService.deleteTimeslotsByIds(removeIds);
      } catch (clearErr) {
        // The booking stands. Say what is on the screen and what fixes it,
        // rather than reporting the whole move as a failure.
        toast({
          title: 'Booked, but the old time is still there',
          description: getUIErrorMessage(
            clearErr,
            'The new booking was made and the old one could not be removed. Remove it in the list of current timeslots'
          ),
          variant: 'destructive',
        });
        refresh();
        return 'booked-not-cleared';
      }

      refresh();
      return 'moved';
    } catch (err) {
      toast({
        title: 'Error',
        description: getUIErrorMessage(err, 'Failed to move the booking'),
        variant: 'destructive',
      });
      throw err;
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
    moveTeamBooking,
  };
};
