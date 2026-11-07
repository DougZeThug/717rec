import { Edit } from 'lucide-react';
import React from 'react';

interface MatchStatusIndicatorProps {
  isEdited?: boolean;
  wasCompletedAndEdited?: boolean;
  isValid?: boolean;
}

const MatchStatusIndicator: React.FC<MatchStatusIndicatorProps> = ({
  isEdited = false,
  wasCompletedAndEdited = false,
  isValid,
}) => {
  return (
    <div className="flex items-center space-x-2">
      {isEdited && (
        <span className="text-xs text-blue-700 dark:text-blue-400 flex items-center">
          <Edit className="size-3 mr-1" />
          Edited
        </span>
      )}
      {wasCompletedAndEdited && (
        <span className="text-xs text-amber-500 flex items-center">
          <Edit className="size-3 mr-1" />
          Rescored
        </span>
      )}
      {!isValid && (
        <span className="text-xs text-destructive-text flex items-center">Invalid Score</span>
      )}
    </div>
  );
};

export default MatchStatusIndicator;
