import React from "react";
import { ShimmerSkeleton } from "@/components/ui/shimmer-skeleton";

/**
 * Inline skeleton for TeamDayTimeslot badge
 * Matches the Badge with Clock icon + timeslot text structure
 */
const TeamDayTimeslotSkeleton: React.FC = () => {
  return (
    <ShimmerSkeleton 
      variant="pill" 
      className="h-5 w-16" 
    />
  );
};

export default TeamDayTimeslotSkeleton;
