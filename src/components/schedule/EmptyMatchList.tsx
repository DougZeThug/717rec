
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
      <CalendarX className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-xl font-medium mb-2" style={{ color: isLight ? "#6b7280" : "#d1d5db" }}>
        {isCompleted ? "No completed matches found" : "No upcoming matches found"}
      </h3>
      <p style={{ color: isLight ? "#9ca3af" : "#9ca3af" }}>
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
