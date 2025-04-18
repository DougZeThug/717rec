
import React from "react";
import { Input } from "@/components/ui/input";

interface ScoreInputProps {
  value: number | null;
  onChange: (value: string) => void;
  isValid?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  className?: string;
  placeholder?: string;
}

const ScoreInput: React.FC<ScoreInputProps> = ({
  value,
  onChange,
  isValid = true,
  disabled = false,
  min = "0",
  max,
  className = "",
  placeholder = ""
}) => {
  return (
    <Input
      type="number"
      min={min}
      max={max}
      value={value === null ? "" : value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full text-center ${!isValid ? "border-red-500" : ""} ${className}`}
      disabled={disabled}
      placeholder={placeholder}
    />
  );
};

export default ScoreInput;
