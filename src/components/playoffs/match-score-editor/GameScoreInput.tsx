
import React from 'react';
import { Input } from '@/components/ui/input';

interface GameScoreInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const GameScoreInput: React.FC<GameScoreInputProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    if (!isNaN(newValue) && newValue >= 0) {
      onChange(newValue);
    }
  };

  return (
    <Input
      type="number"
      min={0}
      max={99}
      value={value}
      onChange={handleChange}
      disabled={disabled}
      className="w-16 text-center"
    />
  );
};

export default GameScoreInput;
