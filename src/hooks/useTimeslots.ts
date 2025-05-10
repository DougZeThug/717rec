import { useState, useEffect } from "react";
import { TeamTimeslot } from "@/types/timeslots";
import { useTimeslotQuery } from "./useTimeslotQuery";
import { useTimeslotMutation } from "./useTimeslotMutation";

export const useTimeslots = (date: Date) => {
  const { timeslots, groupedTimeslots, isLoading, error } = useTimeslotQuery(date);
  const { isSubmitting, addTimeslot, deleteTimeslot, batchAssignTimeslots } = useTimeslotMutation();
  
  // External API remains consistent with previous implementation
  return {
    timeslots,
    isLoading: isLoading || isSubmitting,
    error,
    groupedTimeslots,
    addTimeslot,
    deleteTimeslot,
    batchAssignTimeslots
  };
};
