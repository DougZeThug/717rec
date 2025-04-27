
import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import MatchStatusIndicator from "./MatchStatusIndicator";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

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
        <Switch
          checked={isCompleted}
          onCheckedChange={onCompletedChange}
          disabled={disabled}
          className="transition-opacity duration-200"
        />
        <Label className="text-sm flex items-center gap-1 cursor-pointer" onClick={() => !disabled && onCompletedChange(!isCompleted)}>
          {isCompleted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center text-green-600 dark:text-green-400"
            >
              <Check className="h-3 w-3 mr-1" />
              <span>Match Completed</span>
            </motion.div>
          ) : (
            "Mark as Complete"
          )}
        </Label>
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
