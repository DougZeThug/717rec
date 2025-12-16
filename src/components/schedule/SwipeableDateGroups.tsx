
import React, { useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Match } from "@/types";
import DateMatchGroup from "./DateMatchGroup";
import { format, isToday, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateGroup {
  date: Date;
  matches: Match[];
}

interface SwipeableDateGroupsProps {
  groupedMatches: DateGroup[];
  selectedDate: Date;
  onEditMatch?: (match: Match) => void;
  onDeleteMatch?: (matchId: string) => void;
  activeIndex: number;
  onIndexChange: (index: number) => void;
}

const SwipeableDateGroups: React.FC<SwipeableDateGroupsProps> = ({
  groupedMatches,
  selectedDate,
  onEditMatch,
  onDeleteMatch,
  activeIndex,
  onIndexChange,
}) => {
  // Reset index when it goes out of bounds (e.g., after filtering or tab change)
  useEffect(() => {
    if (groupedMatches.length > 0 && activeIndex >= groupedMatches.length) {
      onIndexChange(groupedMatches.length - 1);
    }
  }, [activeIndex, groupedMatches.length, onIndexChange]);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const threshold = 50;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    if (offset < -threshold || velocity < -500) {
      // Swiped left - go to next
      if (activeIndex < groupedMatches.length - 1) {
        onIndexChange(activeIndex + 1);
      }
    } else if (offset > threshold || velocity > 500) {
      // Swiped right - go to previous
      if (activeIndex > 0) {
        onIndexChange(activeIndex - 1);
      }
    }
  };

  if (groupedMatches.length === 0) {
    return null;
  }

  // Defensive safe index calculation (prevents crash before effect runs)
  const safeIndex = Math.min(Math.max(0, activeIndex), groupedMatches.length - 1);
  const currentGroup = groupedMatches[safeIndex];
  const canGoPrev = safeIndex > 0;
  const canGoNext = safeIndex < groupedMatches.length - 1;

  return (
    <div className="relative">
      {/* Navigation indicators */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => canGoPrev && onIndexChange(activeIndex - 1)}
          disabled={!canGoPrev}
          className={cn(
            "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
            "min-h-[44px] min-w-[44px]", // Touch target
            canGoPrev
              ? "text-primary hover:bg-primary/10 active:scale-95"
              : "text-muted-foreground/50 cursor-not-allowed"
          )}
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex items-center gap-2">
          {groupedMatches.map((_, idx) => (
            <button
              key={idx}
              onClick={() => onIndexChange(idx)}
              className={cn(
                "w-2 h-2 rounded-full transition-all min-w-[20px] min-h-[20px] flex items-center justify-center",
                idx === safeIndex
                  ? "bg-primary scale-125"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            >
              <span className="w-2 h-2 rounded-full" />
            </button>
          ))}
        </div>

        <button
          onClick={() => canGoNext && onIndexChange(activeIndex + 1)}
          disabled={!canGoNext}
          className={cn(
            "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
            "min-h-[44px] min-w-[44px]", // Touch target
            canGoNext
              ? "text-primary hover:bg-primary/10 active:scale-95"
              : "text-muted-foreground/50 cursor-not-allowed"
          )}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Swipeable content */}
      <div className="overflow-hidden touch-pan-y">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={safeIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="cursor-grab active:cursor-grabbing"
          >
            <DateMatchGroup
              date={currentGroup.date}
              matches={currentGroup.matches}
              isCurrentDay={isToday(currentGroup.date) || isSameDay(currentGroup.date, selectedDate)}
              isFirstGroup={safeIndex === 0}
              onEditMatch={onEditMatch}
              onDeleteMatch={onDeleteMatch}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Swipe hint for mobile */}
      <p className="text-center text-xs text-muted-foreground mt-3 sm:hidden">
        Swipe left or right to navigate dates
      </p>
    </div>
  );
};

export default SwipeableDateGroups;
