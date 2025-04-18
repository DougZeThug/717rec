
import React from "react";
import { Input } from "@/components/ui/input";

interface ScoreInputProps {
  value: number | null;
  onChange: (value: string) => void;
  isValid?: boolean;
  disabled?: boolean;
}

const ScoreInput: React.FC<ScoreInputProps> = ({
  value,
  onChange,
  isValid = true,
  disabled = false
}) => {
  return (
    <Input
      type="number"
      min="0"
      value={value === null ? "" : value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full text-center ${!isValid ? "border-red-500" : ""}`}
      disabled={disabled}
    />
  );
};

export default ScoreInput;
