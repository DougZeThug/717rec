import React from 'react';

import { Checkbox } from '@/components/ui/checkbox';

interface CompletionCheckboxProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

const CompletionCheckbox: React.FC<CompletionCheckboxProps> = ({
  id,
  checked,
  onCheckedChange,
  disabled = false,
}) => {
  // Generate an ID if not provided
  const checkboxId = id || `completion-checkbox-${Math.random().toString(36).substring(2, 11)}`;

  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={checkboxId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
      <label
        htmlFor={checkboxId}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Mark as completed
      </label>
    </div>
  );
};

export default CompletionCheckbox;
