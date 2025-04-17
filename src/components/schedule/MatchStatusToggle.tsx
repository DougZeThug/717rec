
import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface MatchStatusToggleProps {
  isCompleted: boolean;
  setIsCompleted: (value: boolean) => void;
}

const MatchStatusToggle: React.FC<MatchStatusToggleProps> = ({
  isCompleted,
  setIsCompleted
}) => {
  return (
    <div className="flex items-center space-x-2 mb-4">
      <Switch
        id="isCompleted"
        checked={isCompleted}
        onCheckedChange={setIsCompleted}
      />
      <Label htmlFor="isCompleted">Match Completed</Label>
    </div>
  );
};

export default MatchStatusToggle;
