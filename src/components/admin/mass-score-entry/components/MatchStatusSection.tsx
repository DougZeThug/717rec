
import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import MatchStatusIndicator from "./MatchStatusIndicator";

interface MatchStatusSectionProps {
  isCompleted: boolean;
  onCompletedChange: (checked: boolean) => void;
  isEdited: boolean;
  isValid: boolean;
  disabled: boolean;
}

const MatchStatusSection: React.FC<MatchStatusSectionProps> = ({
  isCompleted,
  onCompletedChange,
  isEdited,
  isValid,
  disabled
}) => {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={onCompletedChange}
          disabled={disabled}
        />
        <span className="text-sm">Completed</span>
      </div>
      <MatchStatusIndicator
        isEdited={isEdited}
        isValid={isValid}
        isCompleted={isCompleted}
      />
    </div>
  );
};

export default MatchStatusSection;
