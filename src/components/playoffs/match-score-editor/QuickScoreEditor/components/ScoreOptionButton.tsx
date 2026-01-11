import { Check } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { ScoreOption } from '../types';

interface ScoreOptionButtonProps {
  option: ScoreOption;
  selectedOption: string | null;
  isForTeam1: boolean;
  isSubmitting: boolean;
  onSelect: (option: ScoreOption) => void;
  animationDelay: string;
}

const ScoreOptionButton: React.FC<ScoreOptionButtonProps> = ({
  option,
  selectedOption,
  isForTeam1,
  isSubmitting,
  onSelect,
  animationDelay,
}) => {
  const teamClass = isForTeam1 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20';

  const ringClass = isForTeam1
    ? 'ring-blue-500 dark:ring-blue-700'
    : 'ring-red-500 dark:ring-red-700';

  return (
    <Button
      variant={selectedOption === option.label ? 'default' : 'outline'}
      className={cn(
        'h-12 text-lg font-mono',
        option.winner === (isForTeam1 ? 'team1' : 'team2') && teamClass,
        selectedOption === option.label && 'ring-2 ring-offset-2 ' + ringClass
      )}
      onClick={() => onSelect(option)}
      disabled={isSubmitting}
      style={{ animationDelay }}
    >
      {option.label}
      <Check
        className={cn(
          'ml-1 h-4 w-4',
          selectedOption === option.label ? 'text-white' : 'text-green-500'
        )}
      />
    </Button>
  );
};

export default React.memo(ScoreOptionButton);
