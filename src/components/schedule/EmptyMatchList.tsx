
import React from "react";
import { CalendarX } from "lucide-react";
import { useTheme } from "next-themes";

interface EmptyMatchListProps {
  searchTerm: string;
  isCompleted: boolean;
}

const EmptyMatchList: React.FC<EmptyMatchListProps> = ({ searchTerm, isCompleted }) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  
  return (
    <div className="text-center py-12 font-inter">
      <CalendarX className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
      <h3 className="text-xl font-medium mb-2 text-gray-700 dark:text-gray-300">
        {isCompleted ? "No completed matches found" : "No upcoming matches found"}
      </h3>
      <p className="text-gray-500 dark:text-gray-400">
        {searchTerm 
          ? "Try a different search term" 
          : isCompleted 
            ? "Once matches are played, they'll appear here" 
            : "Get started by creating a new match"
        }
      </p>
    </div>
  );
};

export default EmptyMatchList;
