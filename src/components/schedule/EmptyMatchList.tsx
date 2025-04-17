
import React from "react";

interface EmptyMatchListProps {
  searchTerm: string;
  isCompleted: boolean;
}

const EmptyMatchList: React.FC<EmptyMatchListProps> = ({ searchTerm, isCompleted }) => {
  return (
    <div className="text-center py-12">
      <h3 className="text-xl font-medium text-gray-500">
        {isCompleted ? "No completed matches found" : "No upcoming matches found"}
      </h3>
      <p className="text-gray-500 mt-2">
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
