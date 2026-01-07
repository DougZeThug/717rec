import React, { useState, useEffect, memo } from "react";
import { Timer } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface MatchCountdownProps {
  matchDate: string;
}

/**
 * Memoized countdown component that updates every minute.
 * Isolated to prevent parent MatchCard from re-rendering on timer updates.
 */
const MatchCountdown: React.FC<MatchCountdownProps> = memo(({ matchDate }) => {
  const [countdownText, setCountdownText] = useState("");
  const [countdownPercent, setCountdownPercent] = useState(100);

  useEffect(() => {
    const targetDate = new Date(matchDate);
    const now = new Date();
    
    // Only show countdown if match is in the future
    if (targetDate <= now) return;

    const updateCountdown = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCountdownText("Starting now!");
        setCountdownPercent(0);
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      // Calculate percentage for progress bar (using 12 hours max for more responsive feedback)
      const maxDiff = 12 * 60 * 60 * 1000; // 12 hours in ms
      const percentage = Math.max(0, Math.min(100, (diff / maxDiff) * 100));
      setCountdownPercent(100 - percentage); // Invert so it fills up as time gets closer
      
      if (days > 0) {
        setCountdownText(`${days}d ${hours}h until match`);
      } else if (hours > 0) {
        setCountdownText(`${hours}h ${minutes}m until match`);
      } else {
        setCountdownText(`${minutes}m until match`);
      }
    };
    
    updateCountdown();
    const intervalId = setInterval(updateCountdown, 60000); // Update every minute
    
    return () => clearInterval(intervalId);
  }, [matchDate]);

  if (!countdownText) return null;

  return (
    <div className="mt-1 space-y-1">
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Timer className="h-3 w-3" />
        <span>{countdownText}</span>
      </div>
      <Progress value={countdownPercent} className="h-1" />
    </div>
  );
});

MatchCountdown.displayName = "MatchCountdown";

export default MatchCountdown;
