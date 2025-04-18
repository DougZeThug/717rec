
import React from "react";
import { Checkbox } from "@/components/ui/checkbox";

interface CompletionCheckboxProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

const CompletionCheckbox: React.FC<CompletionCheckboxProps> = ({
  id,
  checked,
  onCheckedChange,
  disabled = false
}) => {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
      <label
        htmlFor={id}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Mark as completed
      </label>
    </div>
  );
};

export default CompletionCheckbox;
