
import React from "react";
import { Check, Edit } from "lucide-react";

interface MatchStatusIndicatorProps {
  isEdited: boolean;
  wasCompletedAndEdited: boolean;
  isCompleted: boolean;
}

const MatchStatusIndicator: React.FC<MatchStatusIndicatorProps> = ({
  isEdited,
  wasCompletedAndEdited,
  isCompleted
}) => {
  return (
    <div className="flex items-center space-x-2">
      {isEdited && (
        <span className="text-xs text-blue-500 flex items-center">
          <Edit className="h-3 w-3 mr-1" />
          Edited
        </span>
      )}
      {wasCompletedAndEdited && (
        <span className="text-xs text-amber-500 flex items-center">
          <Edit className="h-3 w-3 mr-1" />
          Rescored
        </span>
      )}
      {isCompleted && !isEdited && (
        <span className="text-xs text-green-500 flex items-center">
          <Check className="h-3 w-3 mr-1" />
          Completed
        </span>
      )}
    </div>
  );
};

export default MatchStatusIndicator;
